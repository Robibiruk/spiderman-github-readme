// GitHub data layer. Client-side only: the optional read-only PAT is sent
// straight to api.github.com from the browser and never leaves it. Without a
// token we stay inside the public rate limit (repos/user/search + a size-based
// language estimate); with a token we also pull the contribution calendar,
// pinned repos (GraphQL) and exact per-repo language bytes.

import type { GitHubData, Hero, LanguageShare, Project, Week } from './types'
import { mulberry32, gaussian, seedOf } from './rand'

const API = 'https://api.github.com'
const GQL = 'https://api.github.com/graphql'

// GitHub rejects the Workers runtime's default "cloudflare-workers" UA with a
// bare 403 (bot filter); a descriptive app UA passes. Browsers ignore this
// header (User-Agent is read-only there), so it only takes effect server-side.
const UA = 'spidey-stats/1.0 (personal github profile badge service)'

export interface Profile {
  login: string
  name: string | null
  bio: string | null
  followers: number
  created_at: string
  avatar_url: string
}

export interface Repo {
  name: string
  full_name: string
  description: string | null
  homepage: string | null
  language: string | null
  stargazers_count: number
  size: number
  languages_url: string
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.message) detail = body.message
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(detail) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------- REST

export async function fetchUser(username: string, token?: string): Promise<Profile> {
  return apiGet<Profile>(`/users/${encodeURIComponent(username)}`, token)
}

export async function fetchRepos(username: string, token?: string): Promise<Repo[]> {
  const all: Repo[] = []
  for (let page = 1; page <= 6; page++) {
    const batch = await apiGet<Repo[]>(
      `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&page=${page}`,
      token,
    )
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

async function searchCount(q: string, token?: string): Promise<number> {
  const res = await apiGet<{ total_count: number }>(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`, token)
  return res.total_count
}

export async function fetchMergedPrs(username: string, token?: string): Promise<number> {
  return searchCount(`author:${username} type:pr is:merged`, token)
}

export async function fetchIssues(username: string, token?: string): Promise<number> {
  return searchCount(`author:${username} type:issue`, token)
}

export async function fetchLanguages(repos: Repo[], token?: string): Promise<LanguageShare[]> {
  const sums: Record<string, number> = {}
  if (token) {
    // Exact byte counts from the languages endpoint, capped to bound requests.
    const sorted = [...repos].sort((a, b) => b.size - a.size).slice(0, 15)
    for (const r of sorted) {
      try {
        const bytes = await apiGet<Record<string, number>>(r.languages_url, token)
        for (const [lang, n] of Object.entries(bytes)) sums[lang] = (sums[lang] ?? 0) + n
      } catch {
        /* keep partial data */
      }
    }
  } else {
    // Tokenless: estimate bytes from repo size (KB) — no extra requests,
    // stays well inside the 60 req/hr public limit.
    for (const r of repos) {
      if (!r.language) continue
      sums[r.language] = (sums[r.language] ?? 0) + r.size * 1000
    }
  }
  const total = Object.values(sums).reduce((a, b) => a + b, 0) || 1
  return Object.entries(sums)
    .map(([name, bytes]) => ({ name, bytes, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 25)
}

// ---------------------------------------------------------------- GraphQL

interface CalendarNode {
  contributionsCollection: {
    contributionCalendar: {
      totalContributions: number
      weeks: Array<{ contributionDays: Array<{ contributionCount: number }> }>
    }
  }
  pinnedItems: {
    nodes: Array<{
      name: string
      description: string | null
      homepageUrl: string | null
      stargazerCount: number
      primaryLanguage: { name: string } | null
    }>
  }
}

export async function fetchGraphQL(username: string, token: string): Promise<CalendarNode | null> {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount } }
          }
        }
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              homepageUrl
              stargazerCount
              primaryLanguage { name }
            }
          }
        }
      }
    }`
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { login: username } }),
  })
  const json = await res.json().catch(() => null)
  if (json?.errors?.length) throw new Error(json.errors[0].message)
  return json?.data?.user ?? null
}

export function calendarToWeeks(cal: CalendarNode): Week[] {
  return cal.contributionsCollection.contributionCalendar.weeks.map((w) => ({
    days: w.contributionDays.map((d) => d.contributionCount),
  }))
}

export function calendarToDays(cal: CalendarNode): number[] {
  return cal.contributionsCollection.contributionCalendar.weeks.flatMap((w) =>
    w.contributionDays.map((d) => d.contributionCount),
  )
}

export function calendarToPinned(cal: CalendarNode): Project[] {
  return cal.pinnedItems.nodes.map((n) => ({
    name: n.name,
    repo: n.name,
    description: n.description ?? '',
    homepage: n.homepageUrl ?? '',
    stargazers: n.stargazerCount,
    primaryLanguage: n.primaryLanguage?.name ?? '',
  }))
}

// ---------------------------------------------------------------- analysis

export interface StreakResult {
  total: number
  current: number
  currentRange: string
  longest: number
  longestRange: string
}

export function streakAnalysis(days: number[], today: Date): StreakResult {
  const total = days.reduce((a, b) => a + b, 0)
  const n = days.length
  const dates: Date[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (n - 1 - i))
    dates.push(d)
  }
  const fmt = (d: Date) =>
    d
      .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      .toUpperCase()
      .replace(' 0', ' ')

  let cur = 0
  let idx = n - 1
  if (idx >= 0 && days[idx] === 0) idx -= 1
  const end = idx
  while (idx >= 0 && days[idx] > 0) {
    cur += 1
    idx -= 1
  }
  const currentRange = cur ? `${fmt(dates[end - cur + 1])} – ${fmt(dates[end])}` : ''

  let longest = 0
  let run = 0
  let rs = 0
  let lstart = 0
  let lend = 0
  for (let i = 0; i < n; i++) {
    if (days[i] > 0) {
      if (run === 0) rs = i
      run += 1
      if (run > longest) {
        longest = run
        lstart = rs
        lend = i
      }
    } else {
      run = 0
    }
  }
  const longestRange = longest ? `${fmt(dates[lstart])} – ${fmt(dates[lend])}` : ''
  return { total, current: cur, currentRange, longest, longestRange }
}

// ---------------------------------------------------------------- demo fallback

/** 52-week demo calendar seeded from the username (mirrors generate.py). */
export function demoWeeks(username: string): { weeks: Week[]; days: number[] } {
  const rand = mulberry32(seedOf(username))
  const weeks: Week[] = []
  const days: number[] = []
  for (let i = 0; i < 52; i++) {
    const w = Math.max(0, Math.round(gaussian(rand) * 6 + 8))
    weeks.push({ days: [w] })
    days.push(w)
  }
  return { weeks, days }
}

export function demoLanguages(username: string): LanguageShare[] {
  const rand = mulberry32(seedOf(username) + 7)
  const names = ['TypeScript', 'Python', 'JavaScript', 'HTML', 'CSS', 'SQL']
  const raw = names.map(() => rand())
  const total = raw.reduce((a, b) => a + b, 0) || 1
  return names
    .map((name, i) => ({
      name,
      bytes: Math.round((raw[i] / total) * 1_000_000),
      pct: (raw[i] / total) * 100,
    }))
    .sort((a, b) => b.pct - a.pct)
}

// ---------------------------------------------------------------- assembly

export function buildHero(opts: {
  followers: number
  created: string | null
  repos: number
  stars: number
  prs: number
  issues: number
  days: number[]
  languages: number
}): Hero {
  const created = opts.created ? new Date(opts.created) : new Date()
  const accountYears = Math.max(
    1,
    Math.round((Date.now() - created.getTime()) / (365 * 24 * 3600 * 1000)),
  )
  const createdLabel = fmtFullDate(created)
  const s = streakAnalysis(opts.days, new Date())
  return {
    commits: s.total,
    stars: opts.stars,
    prs: opts.prs,
    issues: opts.issues,
    repos: opts.repos,
    followers: opts.followers,
    contributed: 0,
    account_years: accountYears,
    total_contribs: s.total,
    current_streak: s.current,
    longest_streak: s.longest,
    current_range: s.currentRange,
    longest_range: s.longestRange,
    window: `SINCE ${createdLabel}`,
    created: createdLabel,
    languages: opts.languages,
  }
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

/** Classify a failed profile lookup so callers can show an honest error badge. */
function classifyUserError(err: unknown): NonNullable<GitHubData['userError']> {
  const status = (err as { status?: number })?.status
  if (status === 404) return 'not_found'
  if (status === 401) return 'unauthorized'
  if (status === 403 || status === 429) return 'rate_limited'
  return 'offline'
}

export async function fetchGitHubData(username: string, token?: string): Promise<GitHubData> {
  let weeks: Week[] | null = null
  let languages: LanguageShare[] = []
  let hero: Hero
  let real = false
  let found = false
  let userError: GitHubData['userError']
  let userErrorDetail: GitHubData['userErrorDetail']
  let projects: Project[] = []
  let profile: Profile | null = null

  try {
    profile = await fetchUser(username, token)
    found = true
    const repos = await fetchRepos(username, token)
    const prs = await fetchMergedPrs(username, token)
    const issues = await fetchIssues(username, token)
    languages = await fetchLanguages(repos, token)
    const topLangCount = languages.filter((l) => l.pct > 1.5).length

    let days: number[] | null = null
    if (token) {
      const cal = await fetchGraphQL(username, token)
      if (cal) {
        weeks = calendarToWeeks(cal)
        days = calendarToDays(cal)
        projects = calendarToPinned(cal)
        real = days.length > 0
      }
    }
    if (!days) {
      const demo = demoWeeks(username)
      weeks = demo.weeks
      days = demo.days
    }
    const stars = repos.reduce((a, r) => a + r.stargazers_count, 0)
    hero = buildHero({
      followers: profile.followers,
      created: profile.created_at,
      repos: repos.length,
      stars,
      prs,
      issues,
      days,
      languages: topLangCount,
    })
  } catch (err) {
    if (!found) {
      userError = classifyUserError(err)
      userErrorDetail = String((err as Error)?.message ?? '').slice(0, 72)
    }
    // Offline / unknown user / rate-limited: full deterministic demo.
    const demo = demoWeeks(username)
    weeks = demo.weeks
    languages = demoLanguages(username)
    hero = buildHero({
      followers: 16,
      created: null,
      repos: 24,
      stars: 8,
      prs: 2,
      issues: 0,
      days: demo.days,
      languages: languages.filter((l) => l.pct > 1.5).length,
    })
  }

  return {
    hero,
    weeks,
    languages,
    projects,
    real,
    found,
    userError,
    userErrorDetail,
    username,
    profileName: profile?.name ?? undefined,
    profileBio: profile?.bio ?? undefined,
  }
}
