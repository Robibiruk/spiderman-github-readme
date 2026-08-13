// Builds the downloadable theme zip entirely client-side. Payload files
// (templates, static SVGs, tools, workflow) are served from app/public;
// the five data SVGs and the README are rendered in-memory from the user's
// choices. Nothing touches a server.

import JSZip from 'jszip'
import type { GenOptions, GitHubData, Week } from './types'
import { buildArsenal } from './arsenal'
import {
  renderSwingSvg,
  renderArsenalSvg,
  renderAchievementsSvg,
  renderHeroStatsSvg,
  renderStreakSvg,
  renderHeroSvg,
  renderSpiderSenseSvg,
  renderReadme,
  weeklySums,
} from './render'

const PAYLOADS = [
  ['templates/README.md.tmpl', 'README.md.tmpl'],
  ['templates/hero.svg.tmpl', 'hero.svg.tmpl'],
  ['static/footer.svg', 'assets/footer.svg'],
  ['static/web-divider.svg', 'assets/web-divider.svg'],
  ['theme/theme.json', 'theme/theme.json'],
  ['tools/generate.py', 'tools/generate.py'],
  ['tools/tech_icons.py', 'tools/tech_icons.py'],
  ['workflow/refresh.yml', '.github/workflows/refresh.yml'],
] as const

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`)
  return res.text()
}

function topLang(langs: { name: string; pct: number }[]): [string, number] {
  return langs.length ? [langs[0].name, langs[0].pct] : ['OTHER', 0]
}

export async function buildZip(o: GenOptions, data: GitHubData): Promise<Blob> {
  const [readmeTmpl, heroTmpl, ...staticFiles] = await Promise.all(
    PAYLOADS.map(([src]) => fetchText(src)),
  )
  const staticMap = new Map<string, string>()
  PAYLOADS.slice(2).forEach(([, dest], i) => staticMap.set(dest, staticFiles[i]))

  const weeks: Week[] = data.weeks ?? []
  const weekly = weeklySums(weeks)
  const hero = data.hero
  const real = data.real
  const tl = topLang(data.languages)

  const readme = renderReadme(readmeTmpl, {
    username: o.username,
    displayName: o.displayName,
    bio: o.bio,
    projects: o.projects,
    socials: o.socials,
    tools: o.tools ?? [],
    statsMode: o.statsMode,
    badgeBase: o.badgeBase,
  })
  const heroSvg = renderHeroSvg(heroTmpl, o.displayName)

  const zip = new JSZip()
  zip.file('README.md', readme)
  zip.file('assets/hero.svg', heroSvg)
  zip.file('assets/web-swing.svg', renderSwingSvg(weekly, real))
  zip.file('assets/hero-stats.svg', renderHeroStatsSvg(hero, real, tl))
  zip.file('assets/achievements.svg', renderAchievementsSvg(hero, real))
  zip.file('assets/web-arsenal.svg', renderArsenalSvg(real, buildArsenal(data.languages, o.tools ?? [])))
  zip.file('assets/streak-stats.svg', renderStreakSvg(hero, real))
  zip.file('assets/spider-sense.svg', renderSpiderSenseSvg(hero, real, data.projects, o.username))
  for (const [dest, content] of staticMap) zip.file(dest, content)

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return blob
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
