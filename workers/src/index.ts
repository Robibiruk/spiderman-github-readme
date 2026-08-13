// Spidey-stats: live GitHub-profile SVGs served from a Cloudflare Worker.
//
// The same pure-TS data + render layer the browser generator uses
// (app/src/lib/github.ts, render.ts, arsenal.ts) runs here server-side with a
// GITHUB_TOKEN secret, so the committed README assets can be swapped for
// always-live badges:
//
//   GET /{username}/{streak|hero-stats|achievements|arsenal|swing}.svg
//
// Responses are cached for BADGE_TTL (6h) via the Cache API, and per-IP +
// per-username throttling plus a global cap keep the shared token's quota safe.

import { fetchGitHubData } from '../../app/src/lib/github'
import type { GitHubData, LanguageShare } from '../../app/src/lib/types'
import {
  renderStreakSvg,
  renderHeroStatsSvg,
  renderAchievementsSvg,
  renderArsenalSvg,
  renderSwingSvg,
  weeklySums,
} from '../../app/src/lib/render'
import { buildArsenal } from '../../app/src/lib/arsenal'

export interface Env {
  GITHUB_TOKEN?: string
  ARSENAL_TOOLS?: string
  BADGE_TTL?: string
}

const ASSETS = ['streak', 'hero-stats', 'achievements', 'arsenal', 'swing'] as const
type Asset = (typeof ASSETS)[number]

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})?$/

// Per-IP+username throttle and a global cap. In-memory per isolate; Cloudflare
// runs a few isolates per location, which is fine for a personal badge server.
const PER_KEY_LIMIT = 20
const GLOBAL_LIMIT = 90
const WINDOW_MS = 60_000
// Share one fetchGitHubData result across all badge assets per username, so a
// README's five badges cost GitHub ~1 burst/hour instead of 5 bursts per visit.
const GH_DATA_TTL = 3600
const hits = new Map<string, { count: number; reset: number }>()
let globalCount = 0
let globalReset = 0

function throttle(key: string): number {
  const now = Date.now()
  if (globalReset < now) {
    globalReset = now + WINDOW_MS
    globalCount = 0
  }
  globalCount += 1
  if (globalCount > GLOBAL_LIMIT) return WINDOW_MS
  const rec = hits.get(key)
  if (!rec || rec.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS })
    return 0
  }
  rec.count += 1
  if (rec.count > PER_KEY_LIMIT) return rec.reset - now
  return 0
}

function svgHeaders(ttl: number): Headers {
  return new Headers({
    'content-type': 'image/svg+xml; charset=utf-8',
    'cache-control': `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`,
    'access-control-allow-origin': '*',
  })
}

function errorBadge(status: number, title: string, hint: string): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="120" viewBox="0 0 1000 120" role="img" aria-label="${esc(title)}">
<rect width="1000" height="120" rx="16" fill="#081426" stroke="#17365C"/>
<text x="500" y="66" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="26" font-weight="bold" letter-spacing="3" fill="#FF3340">${esc(title)}</text>
<text x="500" y="92" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="13" letter-spacing="1" fill="#8B9BB4">${esc(hint)}</text>
</svg>`
  return new Response(svg, { status, headers: svgHeaders(60) })
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function topLang(langs: LanguageShare[]): [string, number] {
  return langs.length ? [langs[0].name, langs[0].pct] : ['OTHER', 0]
}

function render(data: GitHubData, asset: Asset, tools: string[]): string {
  const real = data.real
  switch (asset) {
    case 'streak':
      return renderStreakSvg(data.hero, real)
    case 'hero-stats':
      return renderHeroStatsSvg(data.hero, real, topLang(data.languages))
    case 'achievements':
      return renderAchievementsSvg(data.hero, real)
    case 'arsenal':
      return renderArsenalSvg(real, buildArsenal(data.languages, tools))
    case 'swing':
      return renderSwingSvg(weeklySums(data.weeks ?? []), real)
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('SPIDER-SENSE ONLINE', { headers: { 'content-type': 'text/plain' } })
    }

    // Data endpoint: GET /api/data/{username} -> raw GitHubData JSON
    // Lets the generator fetch without any token in the browser.
    if (url.pathname.startsWith('/api/data/')) {
      const username = url.pathname.slice('/api/data/'.length)
      if (!USERNAME_RE.test(username)) {
        return errorBadge(400, 'INVALID USERNAME', 'LETTERS, NUMBERS AND DASHES ONLY')
      }
      if (!env.GITHUB_TOKEN) {
        return new Response(JSON.stringify({ error: 'MISSING GITHUB_TOKEN' }), { status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
      }
      const cache = (globalThis as { caches?: { default: Cache } }).caches?.default
      let data: GitHubData | null = null
      const ghKey = new Request(`https://ghdata.local/${username}`, { method: 'GET' })
      if (cache) {
        try {
          const hit = await cache.match(ghKey)
          if (hit) data = (await hit.json()) as GitHubData
        } catch {
          data = null
        }
      }
      if (!data) {
        try {
          data = await fetchGitHubData(username, env.GITHUB_TOKEN)
        } catch {
          return new Response(JSON.stringify({ error: 'DATA LINK OFFLINE' }), { status: 502, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
        }
        if (!data.found) {
          return new Response(JSON.stringify({ error: 'NO SUCH USER', userError: data.userError, userErrorDetail: data.userErrorDetail }), { status: 404, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
        }
        if (cache) {
          const stored = new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${GH_DATA_TTL}, s-maxage=${GH_DATA_TTL}` },
          })
          ctx.waitUntil(cache.put(ghKey, stored))
        }
      }
      return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': `public, max-age=${GH_DATA_TTL}, s-maxage=${GH_DATA_TTL}` } })
    }

    const segs = url.pathname.split('/').filter(Boolean)
    const [username, file] = segs
    const match = file?.match(/^([a-z0-9-]+)\.svg$/)
    if (segs.length !== 2 || !match) {
      return errorBadge(404, 'BADGE ROUTE MISSING', 'USE /{USERNAME}/{ASSET}.SVG')
    }
    const asset = match[1] as Asset
    if (!(ASSETS as readonly string[]).includes(asset)) {
      return errorBadge(404, 'UNKNOWN ASSET', `${asset} IS NOT A SERVED BADGE`)
    }
    if (!USERNAME_RE.test(username)) {
      return errorBadge(404, 'INVALID USERNAME', 'LETTERS, NUMBERS AND DASHES ONLY')
    }

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
    const retryAfter = throttle(`${ip}::${username}`)
    if (retryAfter > 0) {
      const r = errorBadge(429, 'TOO MANY REQUESTS', 'SLOW DOWN, SPIDER')
      r.headers.set('retry-after', String(Math.ceil(retryAfter / 1000)))
      return r
    }

    const ttl = Math.min(86_400, Math.max(300, parseInt(env.BADGE_TTL ?? '21600', 10) || 21_600))
    const tools = (url.searchParams.get('tools') ?? env.ARSENAL_TOOLS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!env.GITHUB_TOKEN) {
      return errorBadge(200, 'MISSING GITHUB_TOKEN', 'SET THE WORKER SECRET FOR LIVE STATS')
    }

    const cache = (globalThis as { caches?: { default: Cache } }).caches?.default
    if (cache) {
      const cached = await cache.match(request)
      if (cached) return cached
    }

    let data: GitHubData | null = null
    const ghKey = new Request(`https://ghdata.local/${username}`, { method: 'GET' })
    if (cache) {
      try {
        const hit = await cache.match(ghKey)
        if (hit) data = (await hit.json()) as GitHubData
      } catch {
        data = null
      }
    }
    if (!data) {
      try {
        data = await fetchGitHubData(username, env.GITHUB_TOKEN)
      } catch {
        return errorBadge(200, 'DATA LINK OFFLINE', 'COULD NOT REACH THE GITHUB API')
      }
      if (!data.found) {
        switch (data.userError) {
          case 'unauthorized':
            return errorBadge(200, 'BAD TOKEN', 'GITHUB REJECTED THE WORKER SECRET (401)')
          case 'rate_limited':
            return errorBadge(
              200,
              'RATE LIMITED',
              data.userErrorDetail ? `GITHUB: ${data.userErrorDetail}` : 'GITHUB API LIMIT HIT — TRY LATER',
            )
          case 'offline':
            return errorBadge(200, 'DATA LINK OFFLINE', 'COULD NOT REACH THE GITHUB API')
          default:
            return errorBadge(200, 'NO SUCH USER', `${username.toUpperCase()} NOT FOUND ON GITHUB`)
        }
      }
      if (cache) {
        const stored = new Response(JSON.stringify(data), {
          headers: {
            'content-type': 'application/json',
            'cache-control': `public, max-age=${GH_DATA_TTL}, s-maxage=${GH_DATA_TTL}`,
          },
        })
        ctx.waitUntil(cache.put(ghKey, stored))
      }
    }

    const res = new Response(render(data, asset, tools), { headers: svgHeaders(ttl) })
    if (cache) ctx.waitUntil(cache.put(request, res.clone()))
    return res
  },
}
