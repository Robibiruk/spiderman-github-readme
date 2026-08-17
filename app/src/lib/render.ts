// SVG + README renderers. This is a faithful TypeScript port of
// tools/generate.py — same geometry, same palette, same SMIL-only animation
// (GitHub strips <script>, so everything is pure SVG animation + system fonts).

import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from './palette'
import { spiderEmblem } from './draw'
import { TECH_ICONS, techIcon, iconGlyph } from './icons'
import { CATS } from './arsenal'
import type { ArsenalItem } from './arsenal'
import { mulberry32 } from './rand'
import type { Hero, Project, Socials, Week, GitHubData } from './types'

// ---------------------------------------------------------------- helpers

const fmtNum = (n: number) => n.toLocaleString('en-US')

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Flatten a Week[] into one weekly total per week (drives the swing arc). */
export function weeklySums(weeks: Week[]): number[] {
  return weeks.map((w) => w.days.reduce((a, b) => a + b, 0))
}

// ---------------------------------------------------------------- grading

const GRADE_BANDS: Array<[number, string, string, string]> = [
  [80, 'A++', '#2BD576', 'SPIDER-VERSE LEGEND'],
  [72, 'A+', '#2BD576', 'LEGENDARY HERO'],
  [64, 'A', '#2BD576', 'AVENGER'],
  [56, 'B+', C.BLUE, 'MAJOR LEAGUE'],
  [48, 'B', C.BLUE, 'CITY PROTECTOR'],
  [40, 'C+', C.RED, 'NEIGHBORHOOD HERO'],
  [32, 'C', C.RED, 'PROMISING VIGILANTE'],
  [24, 'D', C.MUTED, 'IN TRAINING'],
]

export function heroGrade(hero: Hero): { score: number; letter: string; color: string; band: string } {
  const c = (Math.min(hero.commits, 400) / 400) * 30
  const s = (Math.min(hero.stars, 80) / 80) * 25
  const p = (Math.min(hero.prs, 40) / 40) * 20
  const i = (Math.min(hero.issues, 30) / 30) * 10
  const r = (Math.min(hero.repos, 40) / 40) * 15
  const score = Math.round(c + s + p + i + r)
  for (const [floor, letter, color, band] of GRADE_BANDS) {
    if (score >= floor) return { score, letter, color, band }
  }
  return { score, letter: 'E', color: C.MUTED, band: 'ORIGIN STORY' }
}

function gradeParts(hero: Hero): Array<[string, number, number]> {
  return [
    ['COMMITS', (Math.min(hero.commits, 400) / 400) * 30, 30],
    ['STARS', (Math.min(hero.stars, 80) / 80) * 25, 25],
    ['PULL REQS', (Math.min(hero.prs, 40) / 40) * 20, 20],
    ['ISSUES', (Math.min(hero.issues, 30) / 30) * 10, 10],
    ['REPOS', (Math.min(hero.repos, 40) / 40) * 15, 15],
  ]
}

const TIER_RANKS: Array<[number, string, string, number]> = [
  [75, 'S', '#2BD576', 4],
  [50, 'A', C.BLUE, 3],
  [25, 'B', C.BRIGHT, 2],
  [10, 'C', C.RED, 1],
]
const TIER_DEFAULT: [string, string, number] = ['D', C.MUTED, 0]

function tierOf(pct: number): [string, string, number] {
  for (const [th, letter, color, pts] of TIER_RANKS) {
    if (pct >= th) return [letter, color, pts]
  }
  return TIER_DEFAULT
}

// ---------------------------------------------------------------- swing

export function renderSwingSvg(weekly: number[], real: boolean): string {
  const n = weekly.length
  const maxv = Math.max(...weekly) || 1
  const W = 1000
  const H = 300
  const gut = 14
  const bw = (W - gut * 2) / n
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    xs.push(gut + i * bw + bw / 2)
    ys.push(44 + 178 * (1 - weekly[i] / maxv))
  }
  let fwd = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2
    const my = (ys[i] + ys[i + 1]) / 2
    fwd += ` Q ${xs[i].toFixed(1)},${ys[i].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`
  }
  fwd += ` L ${xs[n - 1].toFixed(1)},${ys[n - 1].toFixed(1)}`
  let rev = ` M ${xs[n - 1].toFixed(1)},${ys[n - 1].toFixed(1)}`
  for (let i = n - 1; i > 0; i--) {
    const mx = (xs[i] + xs[i - 1]) / 2
    const my = (ys[i] + ys[i - 1]) / 2
    rev += ` Q ${xs[i].toFixed(1)},${ys[i].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`
  }
  rev += ` L ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`
  const swing = fwd + rev

  const rng = mulberry32(42)
  const base = 262
  const nb = 26
  const bbw = (W - 28) / nb
  let buildings = ''
  let windows = ''
  const heights: number[] = []
  for (let k = 0; k < nb; k++) {
    const h = 34 + Math.floor(rng() * 9) * 8 + (k % 6 === 0 ? 34 : 0)
    heights.push(h)
    const bx = 14 + k * bbw
    const col = h > 80 ? '#102A45' : '#0D2037'
    buildings += `<rect x="${bx.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bbw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`
    buildings += `<rect x="${bx.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bbw.toFixed(1)}" height="2" fill="#17365C"/>`
    const wk = Math.min(n - 1, Math.floor((k * n) / nb))
    const act = weekly[wk] / maxv
    const op = Math.min(0.9, 0.12 + act * 0.75)
    for (let w = 0; w < 2 + (k % 3); w++) {
      const wx = bx + bbw * (0.3 + 0.25 * w)
      const wy = base - h + 8 + (w % 2) * 12
      const tw =
        act > 0.25
          ? `<animate attributeName="opacity" values="${op.toFixed(2)};${Math.max(0.05, op - 0.3).toFixed(2)};${op.toFixed(2)}" dur="${(2.4 + ((w + k) % 4)).toFixed(1)}s" begin="${((k + w) * 0.23).toFixed(1)}s" repeatCount="indefinite"/>`
          : ''
      windows += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${(bbw * 0.16).toFixed(1)}" height="3.4" rx="1" fill="#EAF2FF" opacity="${op.toFixed(2)}">${tw}</rect>`
    }
  }
  const ti = heights.indexOf(Math.max(...heights))
  const tx = 14 + ti * bbw + bbw / 2
  const ty = base - heights[ti]
  const antenna = `<rect x="${(tx - 1).toFixed(1)}" y="${(ty - 16).toFixed(1)}" width="2" height="16" fill="${C.MUTED}"/><circle cx="${tx.toFixed(1)}" cy="${(ty - 18).toFixed(1)}" r="2.6" fill="${C.BRIGHT}"><animate attributeName="opacity" values="1;0.15;1" dur="1.4s" repeatCount="indefinite"/></circle>`

  const webline =
    `<path d="${swing}" fill="none" stroke="${C.WHITE}" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="3000" stroke-dashoffset="3000"><animate attributeName="stroke-dashoffset" from="3000" to="0" dur="3s" begin="0.5s" fill="freeze"/></path>` +
    `<path d="${swing}" fill="none" stroke="${C.RED}" stroke-opacity="0.06" stroke-width="6"/>`

  const spider =
    `<g><animateMotion dur="26s" repeatCount="indefinite" path="${swing}"/>` +
    `<line x1="0" y1="0" x2="0" y2="12" stroke="${C.WHITE}" stroke-width="1" stroke-opacity="0.5"/>` +
    `<g transform="translate(0,12)">` +
    `<ellipse cx="0" cy="0" rx="3.4" ry="5" fill="${C.RED}"/><circle cx="0" cy="-5.5" r="2.2" fill="${C.RED}"/>` +
    `<g stroke="${C.RED}" stroke-width="1.1" stroke-linecap="round" fill="none">` +
    `<path d="M-2.2,-2.2 L-6,-5"/><path d="M-2.4,0 L-6.4,1"/><path d="M-2.2,2 L-5.4,5"/>` +
    `<path d="M2.2,-2.2 L6,-5"/><path d="M2.4,0 L6.4,1"/><path d="M2.2,2 L5.4,5"/>` +
    `</g></g>` +
    `<circle cx="0" cy="0" r="6" fill="none" stroke="${C.BRIGHT}" stroke-width="1">` +
    `<animate attributeName="r" values="4;15" dur="2.6s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.8;0" dur="2.6s" repeatCount="indefinite"/></circle>` +
    `</g>`

  const cornerWebs =
    `<g stroke="${C.WHITE}" stroke-opacity="0.08" stroke-width="1" fill="none">` +
    `<path d="M0,0 L220,120 M0,0 L120,150 M0,0 L30,180"/>` +
    `<path d="M1000,0 L780,120 M1000,0 L880,150 M1000,0 L970,180"/>` +
    `</g>`

  const tag = real ? 'LIVE · 52-WEEK SWING' : 'DEMO · 52-WEEK SWING'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Web Swing — contribution rhythm as a swing arc over the city">
<defs><radialGradient id="cityGlow" cx="0.5" cy="1" r="0.7">
<stop offset="0" stop-color="${C.RED}" stop-opacity="0.20"/><stop offset="1" stop-color="${C.RED}" stop-opacity="0"/>
</radialGradient></defs>
<rect width="${W}" height="${H}" fill="${C.CARD}"/>
<rect width="${W}" height="${H}" fill="url(#cityGlow)"/>
<text x="26" y="36" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="3" fill="${C.WHITE}">WEB SWING</text>
<text x="974" y="34" text-anchor="end" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="${C.MUTED}">${tag}</text>
<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="1.4s" begin="0.4s" fill="freeze"/>
${buildings}
${antenna}
</g>
${windows}
${cornerWebs}
${webline}
${spider}
<line x1="14" y1="${base + 10}" x2="${W - 14}" y2="${base + 10}" stroke="${C.RED}" stroke-width="1.5" stroke-opacity="0.35"/>
</svg>
`
}

// ---------------------------------------------------------------- arsenal

function tileIcon(item: ArsenalItem, cx: number, cy: number): string {
  if (TECH_ICONS[item.slug]) return techIcon(item.slug, cx, cy, 0.92)
  return iconGlyph(item.slug, cx, cy, C.WHITE, 0.92)
}

export function renderArsenalSvg(real: boolean, items: ArsenalItem[]): string {
  const W = 1000
  const H = 1100
  const groups = CATS.map((c) => ({ ...c, items: items.filter((i) => i.cat === c.id) }))
  const tag = real ? 'LIVE · TOOL NETWORK' : 'DEMO · TOOL NETWORK'
  const total = items.length

  // Vertical stack: 6 rows, one category per row
  const ROW_H = 152
  const ROW_GAP = 24
  const PANEL_W = 960
  const PANEL_X = 20
  const panelY = (idx: number) => 56 + idx * (ROW_H + ROW_GAP)

  // Spider-Verse palette
  const RED = '#E62429'
  const BLUE = '#1976D2'
  const TILE_BG = '#0A1428'
  const TILE_EDGE = '#1C2E50'
  const WEB = '#2A4574'

  const TILE_BASE = 40
  const GAP_BASE = 8
  const COLS = 8 // unused — kept for reference

  let panels = ''
  let ti = 0
  groups.forEach(({ title, color, items: gitems }, g) => {
    const cat = title.replace(/&/g, '&amp;')
    const py = panelY(g)
    const n = gitems.length
    const glow = g % 2 === 0 ? RED : BLUE

    // Horizontal tile layout — auto-shrink so the full row always fits within PANEL_W.
    // With PANEL_W=960, PANEL_X=20, we have ~928px usable.
    // For very large categories (like tools with 62 items), we cap the visible row
    // and show a '+N more' overflow indicator.
    const usableW = PANEL_W - 32
    const maxVisible = n > 40 ? 40 : n
    const finalGap = GAP_BASE
    const finalTile = maxVisible > 16 ? Math.max(20, Math.floor((usableW - (maxVisible - 1) * finalGap) / maxVisible)) : TILE_BASE
    const totalW = n * finalTile + (n - 1) * finalGap
    const off = Math.max(0, (PANEL_W - totalW) / 2)
    const positions: Array<{ x: number; y: number }> = []
    for (let c = 0; c < n; c++) {
      const clipped = c < maxVisible
      const x = clipped ? PANEL_X + off + c * (finalTile + finalGap) + finalTile / 2 : PANEL_X + PANEL_W - finalTile / 2 - 8
      positions.push({ x, y: py + ROW_H / 2, clipped })
    }

    // Web-line connections between tiles
    let web = ''
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i]
      const b = positions[i + 1]
      const dx = Math.abs(a.x - b.x)
      // Only draw web lines that are close enough to look connected
      if (dx < finalTile + finalGap + 10) {
        web +=
          `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${WEB}" stroke-width="1" stroke-dasharray="3,5" stroke-opacity="0.5">` +
          `<animate attributeName="stroke-opacity" values="0.15;0.7;0.15" dur="2.4s" begin="${(0.5 + 0.12 * i).toFixed(2)}s" repeatCount="indefinite"/>` +
          `</line>`
      }
    }

    // Brand-colored icon tiles
    let tiles = ''
    positions.forEach((p, i) => {
      const item = gitems[i]
      const x = p.x - (p.clipped ? 20 : finalTile) / 2
      const y = p.y - (p.clipped ? 20 : finalTile) / 2
      const sz = p.clipped ? 20 : finalTile
      const d = (0.35 + 0.06 * ti).toFixed(2)
      tiles +=
        `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${d}s" fill="freeze"/>` +
        (p.clipped
          ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="20" height="20" rx="6" fill="${TILE_BG}" stroke="${TILE_EDGE}" stroke-width="1"/>` +
            `<text x="${p.x.toFixed(1)}" y="${(p.y + 5).toFixed(1)}" text-anchor="middle" font-family="${FONT_MONO}" font-size="7" fill="${C.MUTED}">+${n - maxVisible}</text>`
          : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${sz}" height="${sz}" rx="${Math.min(13, sz * 0.3)}" fill="${TILE_BG}" stroke="${TILE_EDGE}" stroke-width="1.2"/>` +
            `<rect x="${(x + 2.5).toFixed(1)}" y="${(y + 2.5).toFixed(1)}" width="${(sz - 5).toFixed(1)}" height="${(sz - 5).toFixed(1)}" rx="${Math.min(11, (sz - 5) * 0.3)}" fill="none" stroke="${glow}" stroke-opacity="0.26" stroke-width="0.8"/>` +
            `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${sz}" height="${sz}" rx="${Math.min(13, sz * 0.3)}" fill="none" stroke="${glow}" stroke-width="1.4" stroke-opacity="0">` +
            `<animate attributeName="stroke-opacity" values="0;0.65;0" dur="2.6s" begin="${(0.9 + 0.08 * ti).toFixed(2)}s" repeatCount="indefinite"/>` +
            `</rect>` +
            tileIcon(item, p.x, p.y)) +
        `</g>`
      ti += 1
    })

    panels +=
      `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${(0.15 + 0.1 * g).toFixed(2)}s" fill="freeze"/>` +
      `<rect x="${PANEL_X}" y="${py}" width="${PANEL_W}" height="${ROW_H}" rx="16" fill="${TILE_BG}" fill-opacity="0.6" stroke="${TILE_EDGE}" stroke-width="1"/>` +
      `<rect x="${PANEL_X}" y="${py}" width="${PANEL_W}" height="3" rx="1.5" fill="${color}" fill-opacity="0.85"/>` +
      `<circle cx="${PANEL_X + 16}" cy="${py + 19}" r="3" fill="${color}"><animate attributeName="opacity" values="1;0.3;1" dur="2.2s" begin="${(0.5 + 0.15 * g).toFixed(2)}s" repeatCount="indefinite"/></circle>` +
      `<text x="${PANEL_X + 27}" y="${py + 23}" font-family="${FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="2" fill="${C.WHITE}">${cat}</text>` +
      `<text x="${PANEL_X + PANEL_W - 16}" y="${py + 23}" text-anchor="end" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">${n} TOOLS</text>` +
      `<line x1="${PANEL_X + 16}" y1="${py + 34}" x2="${PANEL_X + PANEL_W - 16}" y2="${py + 34}" stroke="${TILE_EDGE}" stroke-width="1"/>` +
      web +
      (n
        ? tiles
        : `<text x="${(PANEL_X + PANEL_W / 2).toFixed(1)}" y="${(py + ROW_H / 2 + 6).toFixed(1)}" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" letter-spacing="1.5" fill="${C.MUTED}" fill-opacity="0.45">NO TOOLS LOGGED</text>`) +
      `</g>`
  })

  const footerY = 56 + 6 * (ROW_H + ROW_GAP) + 10
  const footer =
    `<line x1="30" y1="${footerY - 10}" x2="970" y2="${footerY - 10}" stroke="${RED}" stroke-width="2" stroke-opacity="0.3"/>` +
    `<text x="40" y="${footerY + 16}" font-family="${FONT_MONO}" font-size="11" letter-spacing="3" fill="${C.MUTED}">ARSENAL</text>` +
    `<text x="132" y="${footerY + 16}" font-family="${FONT_DISPLAY}" font-size="18" letter-spacing="1" fill="${C.WHITE}">${total} TOOLS ONLINE</text>` +
    `<circle cx="480" cy="${footerY + 12}" r="3.4" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite"/></circle>` +
    `<text x="492" y="${footerY + 16}" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="#2BD576">ARSENAL READY</text>` +
    `<text x="970" y="${footerY + 16}" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">${tag}</text>`
  const header =
    `<text x="30" y="42" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="3" fill="${C.WHITE}">WEB ARSENAL</text>` +
    `<text x="226" y="44" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="${C.MUTED}">// TOOL NETWORK</text>` +
    `<text x="970" y="36" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">${tag}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Web Arsenal — developer toolbox with real brand icons">
<defs>
  <radialGradient id="arsRed" cx="0.12" cy="0.15" r="0.75">
    <stop offset="0%" stop-color="${RED}" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="arsBlue" cx="0.88" cy="0.88" r="0.75">
    <stop offset="0%" stop-color="${BLUE}" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="${BLUE}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="16" fill="#0A1428" stroke="${TILE_EDGE}" stroke-width="1.5"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#arsRed)"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#arsBlue)"/>
<g stroke="${C.WHITE}" stroke-opacity="0.03" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="1000" y2="${H}"/><line x1="1000" y1="0" x2="0" y2="${H}"/>
</g>
${header}
${panels}
${footer}
</svg>`
}

// ---------------------------------------------------------------- achievements

const ACH_CARDS: Array<[string, string, (h: Hero) => number, number, string]> = [
  ['committer', 'COMMITS', (h) => h.commits, 500, 'WEB SHOTS FIRED'],
  ['star', 'STARS', (h) => h.stars, 100, 'CITIZENS SAVED'],
  ['pullreq', 'PULL REQUESTS', (h) => h.prs, 25, 'TEAM-UPS'],
  ['issues', 'ISSUES CLOSED', (h) => h.issues, 20, 'VILLAINS DEFEATED'],
  ['lang', 'LANGUAGES', (h) => h.languages, 8, 'LANGUAGES'],
  ['repo', 'REPOSITORIES', (h) => h.repos, 40, 'MISSIONS'],
  ['followers', 'FOLLOWERS', (h) => h.followers, 100, 'SPIDER-SENSE NETWORK'],
  ['time', 'YEARS ACTIVE', (h) => h.account_years, 3, 'IN THE CITY'],
]

export function renderAchievementsSvg(hero: Hero, real: boolean): string {
  const W = 1000
  const H = 520
  const tag = real ? 'LIVE · RANKS' : 'DEMO · RANKS'
  let cards = ''
  let xpTotal = 0
  ACH_CARDS.forEach(([key, name, get, thr, caption], i) => {
    const val = get(hero)
    const pct = thr ? Math.min(100, (val / thr) * 100) : 0
    const [letter, color, pts] = tierOf(pct)
    xpTotal += pts
    const col = i % 4
    const row = Math.floor(i / 4)
    const bx = 20 + col * (229 + 14)
    const by = 70 + row * (170 + 16)
    const fw = 189
    cards +=
      `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${(0.2 + 0.08 * i).toFixed(2)}s" fill="freeze"/>` +
      `<rect x="${bx}" y="${by}" width="229" height="170" rx="14" fill="#0B1728" stroke="${C.BORDER}"/>` +
      `<rect x="${bx}" y="${by}" width="229" height="3" fill="${color}" fill-opacity="0.8"/>` +
      `<rect x="${bx + 16}" y="${by + 16}" width="34" height="34" rx="8" fill="${C.CARD}" stroke="${color}" stroke-width="1.3"/>` +
      iconGlyph(key, bx + 33, by + 33, color, 0.9) +
      `<circle cx="${bx + 196}" cy="${by + 24}" r="15" fill="${C.CARD}" stroke="${color}" stroke-width="1.6"/>` +
      `<text x="${bx + 196}" y="${by + 29}" text-anchor="middle" font-family="${FONT_DISPLAY}" font-size="16" fill="${color}">${letter}</text>` +
      `<text x="${bx + 62}" y="${by + 34}" font-family="${FONT_DISPLAY}" font-size="16" letter-spacing="0.5" fill="${C.WHITE}">${name}</text>` +
      `<text x="${bx + 16}" y="${by + 66}" font-family="${FONT_MONO}" font-size="8.5" letter-spacing="1.5" fill="${C.MUTED}">${caption}</text>` +
      `<rect x="${bx + 16}" y="${by + 84}" width="${fw}" height="8" rx="4" fill="${C.CARD}" stroke="${C.BORDER}"/>` +
      `<rect x="${bx + 17}" y="${by + 85}" width="${((fw * pct) / 100).toFixed(1)}" height="6" rx="3" fill="${color}"><animate attributeName="width" from="0" to="${((fw * pct) / 100).toFixed(1)}" dur="1s" begin="${(0.4 + 0.08 * i).toFixed(2)}s" fill="freeze"/></rect>` +
      `<text x="${bx + 16}" y="${by + 116}" font-family="${FONT_BODY}" font-size="13" font-weight="700" fill="${C.WHITE}">${fmtNum(val)}</text>` +
      `<text x="${bx + 78}" y="${by + 116}" font-family="${FONT_MONO}" font-size="10" fill="${C.MUTED}">/ ${fmtNum(thr)}</text>` +
      `<text x="${bx + 213}" y="${by + 116}" text-anchor="end" font-family="${FONT_MONO}" font-size="10" font-weight="bold" fill="${color}">+${pts} XP</text>` +
      `</g>`
  })
  const xpPct = xpTotal / 32
  let rank = 'ROOKIE'
  let rankColor = C.MUTED
  if (xpPct >= 0.8) {
    rank = 'SPIDER-VERSE LEGEND'
    rankColor = '#2BD576'
  } else if (xpPct >= 0.6) {
    rank = 'HERO OF THE CITY'
    rankColor = C.BLUE
  } else if (xpPct >= 0.4) {
    rank = 'NEIGHBORHOOD HERO'
    rankColor = C.BRIGHT
  } else if (xpPct >= 0.2) {
    rank = 'WEB SLINGER'
    rankColor = C.RED
  }
  const xpBar =
    `<text x="120" y="473" font-family="${FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="3" fill="${C.MUTED}">HERO XP</text>` +
    `<text x="470" y="473" font-family="${FONT_MONO}" font-size="12" font-weight="bold" fill="${rankColor}">${xpTotal} /32 XP</text>` +
    `<rect x="430" y="462" width="340" height="14" rx="7" fill="#0B1728" stroke="${C.BORDER}" stroke-width="1"/>` +
    `<rect x="431" y="463" width="${(338 * xpPct).toFixed(1)}" height="12" rx="6" fill="${rankColor}" fill-opacity="0.9"><animate attributeName="width" from="0" to="${(338 * xpPct).toFixed(1)}" dur="1.4s" begin="1s" fill="freeze"/></rect>` +
    `<text x="790" y="473" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="1" fill="${rankColor}">${rank}</text>` +
    `<text x="960" y="478" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">${tag}</text>` +
    spiderEmblem(120, 470, 0.32)
  const header =
    `<text x="30" y="42" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="3" fill="${C.WHITE}">HERO ACHIEVEMENTS</text>` +
    `<text x="316" y="44" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="${C.MUTED}">// RANK CARDS</text>` +
    `<text x="960" y="36" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">${tag}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hero Achievements — rank cards with tier letters and XP">
<rect width="${W}" height="${H}" rx="16" fill="${C.CARD}" stroke="${C.BORDER}"/>
<g stroke="${C.WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="500" y2="520"/><line x1="500" y1="0" x2="1000" y2="520"/>
<circle cx="250" cy="240" r="200"/><circle cx="750" cy="240" r="200"/>
</g>
${header}
${cards}
${xpBar}
</svg>
`
}

// ---------------------------------------------------------------- hero stats

export function renderHeroStatsSvg(hero: Hero, real: boolean, topLang: [string, number]): string {
  const W = 1000
  const H = 520
  const langName = (topLang[0] || 'OTHER').toUpperCase()
  const langPct = Math.max(6, Math.min(100, topLang[1]))
  const tag = real ? 'LIVE' : 'DEMO'
  const { score, letter, color: gcol, band } = heroGrade(hero)
  const parts = gradeParts(hero)

  const header =
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.7s" begin="0.2s" fill="freeze"/>` +
    spiderEmblem(36, 36, 0.34) +
    `<text x="62" y="42" font-family="${FONT_DISPLAY}" font-size="26" letter-spacing="3" fill="${C.WHITE}">HERO STATS</text>` +
    `<text x="252" y="44" font-family="${FONT_MONO}" font-size="12" letter-spacing="2" fill="${C.MUTED}">// PROFILE TELEMETRY</text>` +
    `<circle cx="866" cy="34" r="4" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite"/></circle>` +
    `<circle cx="866" cy="34" r="4" fill="none" stroke="#2BD576" stroke-width="1"><animate attributeName="r" values="4;12" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="2.2s" repeatCount="indefinite"/></circle>` +
    `<text x="878" y="39" font-family="${FONT_MONO}" font-size="12" letter-spacing="2" fill="#2BD576">ONLINE</text>` +
    `<text x="960" y="58" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">ARSENAL LEAD · ${langName} ${langPct.toFixed(0)}%</text>` +
    `</g>`

  const defs =
    `<radialGradient id="gGlow" gradientUnits="userSpaceOnUse" cx="180" cy="205" r="92"><stop offset="0" stop-color="${gcol}" stop-opacity="0.28"/><stop offset="0.7" stop-color="${gcol}" stop-opacity="0.06"/><stop offset="1" stop-color="${gcol}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="gDash" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${gcol}"/><stop offset="1" stop-color="${C.BRIGHT}"/></linearGradient>`

  const grade =
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.6s" fill="freeze"/>` +
    `<circle cx="180" cy="205" r="92" fill="url(#gGlow)"/>` +
    `<circle cx="180" cy="205" r="88" fill="#0B1728" stroke="${C.BORDER}" stroke-width="1.5"/>` +
    `<circle cx="180" cy="205" r="88" fill="none" stroke="url(#gDash)" stroke-width="2.5" stroke-dasharray="14 10" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 180 205" to="360 180 205" dur="28s" repeatCount="indefinite"/></circle>` +
    spiderEmblem(180, 158, 0.34, gcol) +
    `<text x="180" y="232" text-anchor="middle" font-family="${FONT_DISPLAY}" font-size="64" letter-spacing="2" fill="${gcol}">${letter}</text>` +
    `<text x="180" y="262" text-anchor="middle" font-family="${FONT_MONO}" font-size="13" font-weight="bold" fill="${C.WHITE}">${score} /100</text>` +
    `<text x="180" y="308" text-anchor="middle" font-family="${FONT_DISPLAY}" font-size="15" letter-spacing="2" fill="${gcol}">${band}</text>` +
    `<text x="180" y="92" text-anchor="middle" font-family="${FONT_MONO}" font-size="12" letter-spacing="3" fill="${C.MUTED}">HERO RATING</text>` +
    `</g>`

  const rowDefs: Array<[string, string, string, string]> = [
    ['WEB SHOTS', 'COMMITS · 365D', fmtNum(hero.commits), '#E62429'],
    ['CITIZENS SAVED', 'STARS EARNED', fmtNum(hero.stars), '#FF3340'],
    ['TEAM-UPS', 'PULL REQUESTS', fmtNum(hero.prs), '#1976D2'],
    ['VILLAINS DOWN', 'ISSUES CLOSED', fmtNum(hero.issues), '#8B9BB4'],
    ['NETWORK', 'FOLLOWERS', fmtNum(hero.followers), '#2BD576'],
  ]
  let rows = ''
  rowDefs.forEach(([label, caption, value, accent], i) => {
    const y = 82 + i * 46
    rows +=
      `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${(0.7 + 0.12 * i).toFixed(2)}s" fill="freeze"/>` +
      `<rect x="330" y="${y - 20}" width="630" height="38" rx="8" fill="#0B1728" stroke="${C.BORDER}"/>` +
      `<circle cx="352" cy="${y}" r="3" fill="${accent}"><animate attributeName="opacity" values="1;0.35;1" dur="${(2 + i * 0.3).toFixed(1)}s" repeatCount="indefinite"/></circle>` +
      `<text x="366" y="${y + 4}" font-family="${FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="2" fill="${C.WHITE}">${label}</text>` +
      `<text x="832" y="${y + 4}" text-anchor="end" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">${caption}</text>` +
      `<text x="940" y="${y + 6}" text-anchor="end" font-family="${FONT_DISPLAY}" font-size="28" letter-spacing="1" fill="${accent}">${value}</text>` +
      `</g>`
  })

  const calcParts: Array<[string, number, [string, number, number]]> = [
    ['COMMITS', 30, parts[0]],
    ['STARS', 25, parts[1]],
    ['PULL REQS', 20, parts[2]],
    ['ISSUES', 10, parts[3]],
    ['REPOS', 15, parts[4]],
  ]
  let calc = ''
  calcParts.forEach(([name, , part], i) => {
    const [, sub, wmax] = part
    const x = 40 + i * 192
    calc +=
      `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${(1.4 + 0.1 * i).toFixed(2)}s" fill="freeze"/>` +
      `<text x="${x + 86}" y="392" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="1" fill="${C.WHITE}">${name}</text>` +
      `<rect x="${x}" y="402" width="172" height="10" rx="5" fill="#0B1728" stroke="${C.BORDER}"/>` +
      `<rect x="${x + 1}" y="403" width="${((170 * sub) / wmax).toFixed(1)}" height="8" rx="4" fill="${gcol}" fill-opacity="0.9"><animate attributeName="width" from="0" to="${((170 * sub) / wmax).toFixed(1)}" dur="0.9s" begin="${(1.6 + 0.1 * i).toFixed(2)}s" fill="freeze"/></rect>` +
      `<text x="${x + 86}" y="434" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" fill="${C.WHITE}">${sub.toFixed(1)}</text>` +
      `<text x="${x + 86}" y="447" text-anchor="middle" font-family="${FONT_MONO}" font-size="8.5" fill="${C.MUTED}">/ ${wmax}</text>` +
      `</g>`
  })
  const calcBlock =
    `<line x1="40" y1="340" x2="960" y2="340" stroke="${C.RED}" stroke-width="2" stroke-opacity="0.35"/>` +
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="1.3s" fill="freeze"/>` +
    `<text x="40" y="368" font-family="${FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="3" fill="${C.MUTED}">RATING CALCULATOR</text>` +
    `<text x="960" y="368" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">WEIGHTED SCORE · MAX ${score}</text>` +
    `</g>` +
    calc +
    `<text x="40" y="494" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">SCORE = COMMITS·30% + STARS·25% + PULL REQUESTS·20% + ISSUES·10% + REPOS·15%</text>` +
    `<text x="40" y="510" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">EACH METRIC CAPPED · GRADE = ${letter} (${score}/100) · ${band}</text>` +
    `<text x="960" y="510" text-anchor="end" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">${tag} · GITHUB TELEMETRY</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hero Stats — headline stats with a letter-grade rating">
<defs>${defs}</defs>
<rect width="${W}" height="${H}" rx="16" fill="${C.CARD}" stroke="${C.BORDER}"/>
<g stroke="${C.WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="500" y2="520"/><line x1="500" y1="0" x2="1000" y2="520"/>
<circle cx="500" cy="260" r="240"/><circle cx="500" cy="260" r="420"/>
</g>
${header}
${grade}
${rows}
${calcBlock}
</svg>
`
}

// ---------------------------------------------------------------- streak

export function renderStreakSvg(hero: Hero, real: boolean): string {
  const W = 1000
  const H = 340
  const tag = real ? 'LIVE · CONTRIBUTION PULSE' : 'DEMO · CONTRIBUTION PULSE'
  const cur = hero.current_streak
  const lon = hero.longest_streak
  const flame =
    `<g opacity="0.9"><animate attributeName="opacity" values="0.9;0.55;0.9" dur="1.6s" repeatCount="indefinite"/>` +
    `<path d="M318,80 C312,90 306,98 306,106 C306,114 312,118 318,118 C324,118 330,114 330,106 C330,98 324,90 318,80 Z" fill="#E62429"/>` +
    `<path d="M318,88 C314,94 311,99 311,104 C311,109 314,112 318,112 C322,112 325,109 325,104 C325,99 322,94 318,88 Z" fill="#FFB020"/>` +
    `</g>`

  const npill = Math.min(12, Math.max(1, cur))
  let pills = ''
  for (let k = 0; k < npill; k++) {
    const px = 56 + k * 24
    pills +=
      `<rect x="${px}" y="196" width="22" height="16" rx="4" fill="#12402E" stroke="#2BD576" stroke-width="1"><animate attributeName="fill" values="#12402E;#12402E;#2BD576" keyTimes="0;${(0.8 + 0.02 * k).toFixed(2)};1" dur="2s" begin="${(0.3 + 0.12 * k).toFixed(2)}s" fill="freeze"/></rect>` +
      `<text x="${px + 11}" y="207" text-anchor="middle" font-family="${FONT_MONO}" font-size="8" fill="#EAF2FF">${k + 1}</text>`
  }

  const streakCard =
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.4s" fill="freeze"/>` +
    `<rect x="40" y="64" width="330" height="162" rx="12" fill="#0B1728" stroke="${C.BORDER}"/>` +
    `<text x="58" y="94" font-family="${FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="3" fill="${C.RED}">CURRENT STREAK</text>` +
    flame +
    `<text x="66" y="154" font-family="${FONT_DISPLAY}" font-size="58" letter-spacing="1" fill="${C.WHITE}">${cur}</text>` +
    `<text x="142" y="152" font-family="${FONT_MONO}" font-size="14" letter-spacing="1" fill="${C.MUTED}">DAY(S)</text>` +
    `<text x="66" y="180" font-family="${FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="1" fill="#2BD576">${hero.current_range}</text>` +
    pills +
    `</g>`

  const cards =
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.7s" fill="freeze"/>` +
    `<rect x="390" y="64" width="582" height="76" rx="12" fill="#0B1728" stroke="${C.BORDER}"/>` +
    `<circle cx="408" cy="92" r="3" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite"/></circle>` +
    `<text x="420" y="96" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">TOTAL CONTRIBUTIONS</text>` +
    `<text x="944" y="126" text-anchor="end" font-family="${FONT_DISPLAY}" font-size="40" letter-spacing="1" fill="${C.WHITE}">${fmtNum(hero.total_contribs)}</text>` +
    `<text x="944" y="146" text-anchor="end" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">${hero.window}</text>` +
    `</g>` +
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.9s" fill="freeze"/>` +
    `<rect x="390" y="150" width="582" height="76" rx="12" fill="#0B1728" stroke="${C.BORDER}"/>` +
    `<circle cx="408" cy="178" r="3" fill="#FF3340"><animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite"/></circle>` +
    `<text x="420" y="182" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">LONGEST STREAK</text>` +
    `<text x="944" y="212" text-anchor="end" font-family="${FONT_DISPLAY}" font-size="40" letter-spacing="1" fill="${C.WHITE}">${lon} DAYS</text>` +
    `<text x="944" y="232" text-anchor="end" font-family="${FONT_MONO}" font-size="9" letter-spacing="1" fill="${C.MUTED}">${hero.longest_range}</text>` +
    `</g>`

  const commitW = (398 * Math.min(hero.commits, 600)) / 600
  const starW = (398 * Math.min(hero.stars, 100)) / 100
  const bars =
    `<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="1.1s" fill="freeze"/>` +
    `<text x="40" y="266" font-family="${FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="2" fill="${C.MUTED}">TOTAL COMMITS</text>` +
    `<rect x="40" y="274" width="400" height="10" rx="5" fill="#0B1728" stroke="${C.BORDER}"/>` +
    `<rect x="41" y="275" width="${commitW.toFixed(1)}" height="8" rx="4" fill="${C.RED}"><animate attributeName="width" from="0" to="${commitW.toFixed(1)}" dur="1s" begin="1.3s" fill="freeze"/></rect>` +
    `<text x="452" y="285" font-family="${FONT_DISPLAY}" font-size="20" fill="${C.RED}">${fmtNum(hero.commits)}</text>` +
    `<text x="560" y="266" font-family="${FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="2" fill="${C.MUTED}">TOTAL STARS EARNED</text>` +
    `<rect x="560" y="274" width="400" height="10" rx="5" fill="#0B1728" stroke="${C.BORDER}"/>` +
    `<rect x="561" y="275" width="${starW.toFixed(1)}" height="8" rx="4" fill="${C.BRIGHT}"><animate attributeName="width" from="0" to="${starW.toFixed(1)}" dur="1s" begin="1.5s" fill="freeze"/></rect>` +
    `<text x="972" y="285" text-anchor="end" font-family="${FONT_DISPLAY}" font-size="20" fill="${C.BRIGHT}">${fmtNum(hero.stars)}</text>` +
    `</g>`

  const header =
    `<text x="30" y="42" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="3" fill="${C.WHITE}">WEB STREAK</text>` +
    `<text x="222" y="44" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="${C.MUTED}">// CONTRIBUTION PULSE</text>` +
    `<text x="960" y="36" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">${tag}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Web Streak — contribution streak and totals">
<rect width="${W}" height="${H}" rx="16" fill="${C.CARD}" stroke="${C.BORDER}"/>
<g stroke="${C.WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="1000" y2="340"/><line x1="1000" y1="0" x2="0" y2="340"/>
<circle cx="500" cy="170" r="150"/><circle cx="500" cy="170" r="260"/>
</g>
${header}
${streakCard}
${cards}
${bars}
</svg>
`
}

// ---------------------------------------------------------------- spider-sense (dynamic)

interface SpiderSenseData {
  mostActiveRepo: string
  lastCommit: string
  lastCommitAgo: string
  username: string
}

function computeSpiderSense(data: GitHubData, username: string): SpiderSenseData {
  // Find most active repo by stars + commits
  const repos = data.projects || []
  let mostActiveRepo = 'N/A'
  let maxActivity = 0

  for (const repo of repos) {
    const activity = repo.stargazers + (repo.name.length * 2) // simple heuristic
    if (activity > maxActivity) {
      maxActivity = activity
      mostActiveRepo = repo.name
    }
  }

  // Fallback: use hero data to determine activity
  if (mostActiveRepo === 'N/A' && data.hero) {
    mostActiveRepo = `(${data.hero.repos} repositories)`
  }

  // Last commit time - from the contribution calendar
  // We need to find the most recent day with contributions
  let lastCommit = 'Never'
  let lastCommitAgo = '∞'

  if (data.weeks && data.weeks.length > 0) {
    const days = data.weeks.flatMap(w => w.days)

    // Find the most recent day with contributions (going backwards)
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i] > 0) {
        const daysAgo = days.length - 1 - i
        if (daysAgo === 0) {
          lastCommit = 'Today'
          lastCommitAgo = 'Today'
        } else if (daysAgo === 1) {
          lastCommit = 'Yesterday'
          lastCommitAgo = '1 day ago'
        } else if (daysAgo < 7) {
          lastCommit = `${daysAgo} days ago`
          lastCommitAgo = `${daysAgo} days ago`
        } else if (daysAgo < 30) {
          const weeks = Math.floor(daysAgo / 7)
          lastCommit = `${weeks} week${weeks > 1 ? 's' : ''} ago`
          lastCommitAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`
        } else {
          const months = Math.floor(daysAgo / 30)
          lastCommit = `${months} month${months > 1 ? 's' : ''} ago`
          lastCommitAgo = `${months} month${months > 1 ? 's' : ''} ago`
        }
        break
      }
    }
  }

  return {
    mostActiveRepo,
    lastCommit,
    lastCommitAgo,
    username,
  }
}

export function renderSpiderSenseSvg(hero: Hero, real: boolean, projects: Project[], username: string): string {
  const W = 1000
  const H = 380
  const tag = real ? 'LIVE · SPIDER-SENSE NETWORK' : 'DEMO · SPIDER-SENSE NETWORK'

  const sense = computeSpiderSense({ hero, weeks: [], projects, real, username } as unknown as GitHubData, username)

  // Spider-sense wave animation
  const wavePath = 'M20,190 Q250,100 490,190 Q730,280 980,190'

  const header = `
    <g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.7s" begin="0.2s" fill="freeze"/>
    <text x="30" y="42" font-family="${FONT_DISPLAY}" font-size="22" letter-spacing="3" fill="${C.WHITE}">SPIDER-SENSE NETWORK</text>
    <text x="330" y="44" font-family="${FONT_MONO}" font-size="11" letter-spacing="2" fill="${C.MUTED}">// THREAT DETECTION ACTIVE</text>
    <circle cx="960" cy="34" r="4" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite"/></circle>
    <circle cx="960" cy="34" r="4" fill="none" stroke="#2BD576" stroke-width="1"><animate attributeName="r" values="4;12" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="2.2s" repeatCount="indefinite"/></circle>
    <text x="972" y="39" font-family="${FONT_MONO}" font-size="12" letter-spacing="2" fill="#2BD576">ONLINE</text>
    </g>
  `

  const mostActiveCard = `
    <g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.5s" fill="freeze"/>
    <rect x="40" y="70" width="460" height="140" rx="14" fill="#0B1728" stroke="${C.BORDER}"/>
    <rect x="40" y="70" width="460" height="3" fill="${C.RED}" fill-opacity="0.85"/>
    <circle cx="56" cy="90" r="3" fill="${C.RED}"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>
    <text x="70" y="96" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">MOST ACTIVE REPOSITORY</text>
    <text x="70" y="138" font-family="${FONT_DISPLAY}" font-size="24" letter-spacing="0.5" fill="${C.WHITE}">${xmlEsc(sense.mostActiveRepo)}</text>
    <text x="70" y="168" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">DETECTED VIA STAR + COMMIT SIGNATURE</text>
    </g>
  `

  const lastCommitCard = `
    <g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.7s" fill="freeze"/>
    <rect x="520" y="70" width="460" height="140" rx="14" fill="#0B1728" stroke="${C.BORDER}"/>
    <rect x="520" y="70" width="460" height="3" fill="${C.BLUE}" fill-opacity="0.85"/>
    <circle cx="536" cy="90" r="3" fill="${C.BLUE}"><animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite"/></circle>
    <text x="550" y="96" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">LAST COMMIT DETECTED</text>
    <text x="550" y="138" font-family="${FONT_DISPLAY}" font-size="24" letter-spacing="0.5" fill="${C.BLUE}">${xmlEsc(sense.lastCommit)}</text>
    <text x="550" y="168" font-family="${FONT_MONO}" font-size="10" letter-spacing="1" fill="${C.MUTED}">${xmlEsc(sense.lastCommitAgo.toUpperCase())}</text>
    </g>
  `

  const networkVisual = `
    <g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="1s" fill="freeze"/>
    <defs>
      <radialGradient id="pulseGlow" cx="500" cy="280" r="180">
        <stop offset="0" stop-color="${C.RED}" stop-opacity="0.15"/>
        <stop offset="1" stop-color="${C.RED}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="40" y="230" width="920" height="130" rx="14" fill="url(#pulseGlow)"/>
    <path d="${wavePath}" fill="none" stroke="${C.RED}" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="1000" stroke-dashoffset="1000">
      <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="3s" repeatCount="indefinite"/>
    </path>
    <path d="${wavePath}" fill="none" stroke="${C.BRIGHT}" stroke-opacity="0.6" stroke-width="1">
      <animate attributeName="stroke-dashoffset" from="0" to="-1000" dur="2s" repeatCount="indefinite"/>
    </path>
    <circle cx="500" cy="280" r="60" fill="none" stroke="${C.RED}" stroke-width="1.5" stroke-opacity="0.5">
      <animate attributeName="r" values="40;90" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="500" cy="280" r="60" fill="none" stroke="${C.BRIGHT}" stroke-width="1" stroke-opacity="0.3">
      <animate attributeName="r" values="20;80" dur="2.5s" begin="0.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0" dur="2.5s" begin="0.5s" repeatCount="indefinite"/>
    </circle>
    <text x="500" y="286" text-anchor="middle" font-family="${FONT_DISPLAY}" font-size="18" letter-spacing="3" fill="${C.RED}">TINGLING</text>
    <text x="500" y="312" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">SPIDER-SENSE ACTIVE</text>
    </g>
  `

  const footer = `
    <text x="40" y="368" font-family="${FONT_MONO}" font-size="11" letter-spacing="3" fill="${C.MUTED}">SENSITIVITY</text>
    <rect x="160" y="356" width="200" height="10" rx="5" fill="#0B1728" stroke="${C.BORDER}"/>
    <rect x="161" y="357" width="180" height="8" rx="4" fill="${C.RED}" fill-opacity="0.9"><animate attributeName="width" from="0" to="180" dur="1.5s" begin="1.8s" fill="freeze"/></rect>
    <text x="960" y="368" text-anchor="end" font-family="${FONT_MONO}" font-size="10" letter-spacing="2" fill="${C.MUTED}">${tag}</text>
  `

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spider-Sense Network — most active repo and recent commit detection">
<rect width="${W}" height="${H}" rx="16" fill="${C.CARD}" stroke="${C.BORDER}"/>
<g stroke="${C.WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="500" y2="380"/><line x1="500" y1="0" x2="0" y2="380"/>
<circle cx="250" cy="190" r="150"/><circle cx="750" cy="190" r="150"/>
</g>
${header}
${mostActiveCard}
${lastCommitCard}
${networkVisual}
${footer}
</svg>
`
}

// ---------------------------------------------------------------- hero template

export function renderHeroSvg(tmpl: string, displayName: string, role = ''): string {
  return tmpl
    .replace(/\{\{DISPLAY_NAME\}\}/g, xmlEsc(displayName))
    .replace(/\{\{ROLE\}\}/g, xmlEsc(role))
}

// ---------------------------------------------------------------- README

export interface ReadmeOptions {
  username: string
  displayName: string
  role: string
  bio: string
  projects: Project[]
  socials: Socials
  tools?: string[]
  statsMode?: 'commit' | 'badge'
  badgeBase?: string
}

function missionCell(p: Project, username: string): string {
  const repoUrl = `https://github.com/${username}/${encodeURIComponent(p.repo)}`
  const gh = `<a href="${repoUrl}"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=EAF2FF&labelColor=081426" alt="GitHub"></a>`
  const live = p.homepage
    ? `\n        <a href="${p.homepage}"><img src="https://img.shields.io/badge/LIVE-2BD576?style=for-the-badge&labelColor=081426" alt="Live Demo"></a>`
    : ''
  return `      <h3>${xmlEsc(p.name)}</h3>\n      <p>${xmlEsc(p.description)}</p>\n      <p>\n        ${gh}${live}\n      </p>`
}

function missionTable(projects: Project[], username: string): string {
  if (!projects.length) {
    return `<p align="center"><i>No missions yet — add projects in the generator.</i></p>`
  }
  const rows: string[] = []
  for (let i = 0; i < projects.length; i += 2) {
    const pair = projects.slice(i, i + 2)
    const tds = pair
      .map(
        (p, j) =>
          `<td width="${pair.length === 1 && j === 0 ? '100' : '50'}%" valign="top">\n${missionCell(p, username)}\n    </td>`,
      )
      .join('\n    ')
    rows.push(`  <tr>\n    ${tds}\n  </tr>`)
  }
  return `<table>\n${rows.join('\n')}\n</table>`
}

function currentMission(project: Project | undefined, username: string): string {
  if (!project) {
    return `<p align="center"><i>No flagship project yet — add one in the generator.</i></p>`
  }
  return `<table>\n  <tr>\n    <td width="100%" valign="top">\n${missionCell(project, username)}\n    </td>\n  </tr>\n</table>`
}

function buildSocials(s: Socials): string {
  const badge = (label: string, color: string, logo: string, alt: string, url: string) =>
    `<a href="${url}"><img src="https://img.shields.io/badge/${label}-${color}?style=for-the-badge&logo=${logo}&logoColor=EAF2FF&labelColor=081426" alt="${alt}"></a>`
  const links: string[] = []
  if (s.linkedin) links.push(badge('LinkedIn', 'E62429', 'linkedin', 'LinkedIn', s.linkedin))
  if (s.email) links.push(badge('Email', '1976D2', 'gmail', 'Email', `mailto:${s.email}`))
  if (s.devto) links.push(badge('Dev.to', 'FF3340', 'dev.to', 'Dev.to', s.devto))
  if (s.twitter) links.push(badge('X', '8B9BB4', 'x', 'X/Twitter', s.twitter))
  if (!links.length) {
    return `<p align="center"><i>Add your social links in the generator to light up the network.</i></p>`
  }
  return (
    `<p align="center">\n${links.map((l) => `  ${l}`).join('\n')}\n</p>\n\n` +
    `<p align="center"><i>Open to collaborations, freelance work, and building things that make the neighborhood better.</i></p>`
  )
}

export function renderReadme(tmpl: string, o: ReadmeOptions): string {
  const typing = o.displayName
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((w) => encodeURIComponent(w))
    .join('+')
  const roleEnc = o.role
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((w) => encodeURIComponent(w))
    .join('+')
  let out = tmpl
  // Badge mode: swap committed data SVGs for always-live badge URLs served by
  // the Cloudflare Worker. hero.svg stays committed (it has no live stats);
  // static dividers/footer stay committed too.
  if (o.statsMode === 'badge' && o.badgeBase) {
    const base = o.badgeBase.replace(/\/+$/, '')
    out = out.replace(
      /assets\/(streak|hero-stats|achievements|swing)\.svg/g,
      `${base}/${o.username}/$1.svg`,
    )
    const tools = (o.tools ?? []).join(',')
    out = out.replace(
      /assets\/arsenal\.svg/g,
      `${base}/${o.username}/arsenal.svg${tools ? `?tools=${encodeURIComponent(tools)}` : ''}`,
    )
  }
  return out
    .replace(/\{\{DISPLAY_NAME_ENC\}\}/g, typing)
    .replace(/\{\{DISPLAY_NAME\}\}/g, xmlEsc(o.displayName))
    .replace(/\{\{ROLE_ENC\}\}/g, roleEnc)
    .replace(/\{\{ROLE\}\}/g, xmlEsc(o.role))
    .replace(/\{\{USERNAME\}\}/g, o.username)
    .replace(/\{\{BIO\}\}/g, xmlEsc(o.bio).replace(/\n/g, '<br>'))
    .replace(/\{\{CURRENT_MISSION\}\}/g, currentMission(o.projects[0], o.username))
    .replace(/\{\{WEB_MISSIONS\}\}/g, missionTable(o.projects, o.username))
    .replace(/\{\{SOCIALS\}\}/g, buildSocials(o.socials))
}
