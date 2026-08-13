// Icon layer: vendored simple-icons brand paths (icons.json, CC0) + the
// geometric glyph set from tools/generate.py (icon_glyph / tech_icon), plus
// a GitHub-language → brand-slug matcher for the dynamic arsenal core.

import iconsData from './icons.json'
import { C, FONT_MONO } from './palette'
import { spiderEmblem, starPts } from './draw'

export interface TechIconData {
  slug: string
  label: string
  hex: string
  path: string
}

const ICONS = iconsData as TechIconData[]

export const TECH_ICONS: Record<string, TechIconData> = Object.fromEntries(
  ICONS.map((i) => [i.slug, i]),
)

/** Simple-icons brand path centered at (cx,cy) and scaled. */
export function techIcon(slug: string, cx: number, cy: number, size = 1.0): string {
  const icon = TECH_ICONS[slug]
  if (!icon) return ''
  const fill = icon.hex || C.WHITE
  return `<g transform="translate(${(cx - 12 * size).toFixed(2)}, ${(cy - 12 * size).toFixed(2)}) scale(${size.toFixed(3)})"><path d="${icon.path}" fill="${fill}"/></g>`
}

/** Compact geometric glyph (no external assets). Returns '' for unknown keys. */
export function iconGlyph(key: string, x: number, y: number, accent: string, s = 1.0): string {
  const k = key.toLowerCase().replace(/\./g, '')
  const sw = 1.8 * s
  const n = (v: number) => v.toFixed(1)
  if (k === 'typescript') return glyphText(x, y + 6 * s, 13 * s, accent, 'TS')
  if (k === 'javascript') return glyphText(x, y + 6 * s, 13 * s, accent, 'JS')
  if (k === 'html') return glyphText(x, y + 5 * s, 12 * s, accent, '&lt;/&gt;')
  if (k === 'css') return glyphText(x, y + 6 * s, 14 * s, accent, '#')
  if (k === 'python')
    return (
      `<path d="M${n(x - 7 * s)},${n(y + 3 * s)} C${n(x - 9 * s)},${n(y - 4 * s)} ${n(x - 3 * s)},${n(y - 7 * s)} ${n(x + s)},${n(y - 4 * s)} C${n(x + 5 * s)},${n(y - s)} ${n(x + 7 * s)},${n(y - s)} ${n(x + 7 * s)},${n(y - 4 * s)}" fill="none" stroke="${accent}" stroke-width="${n(sw)}" stroke-linecap="round"/>` +
      `<path d="M${n(x + 7 * s)},${n(y - 3 * s)} C${n(x + 9 * s)},${n(y + 4 * s)} ${n(x + 3 * s)},${n(y + 7 * s)} ${n(x - s)},${n(y + 4 * s)} C${n(x - 5 * s)},${n(y + s)} ${n(x - 7 * s)},${n(y + s)} ${n(x - 7 * s)},${n(y + 4 * s)}" fill="none" stroke="${accent}" stroke-width="${n(sw)}" stroke-linecap="round"/>`
    )
  if (k === 'jupyter')
    return (
      `<circle cx="${n(x)}" cy="${n(y - 7 * s)}" r="${n(3 * s)}" fill="${accent}"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(3 * s)}" fill="${accent}"/>` +
      `<circle cx="${n(x)}" cy="${n(y + 7 * s)}" r="${n(3 * s)}" fill="${accent}"/>`
    )
  if (k === 'fastapi')
    return `<path d="M${n(x + 2 * s)},${n(y - 9 * s)} L${n(x - 6 * s)},${n(y + s)} L${n(x - s)},${n(y + s)} L${n(x - 2 * s)},${n(y + 9 * s)} L${n(x + 6 * s)},${n(y - s)} L${n(x + s)},${n(y - s)} Z" fill="${accent}"/>`
  if (k === 'nodejs' || k === 'node')
    return (
      `<path d="M${n(x)},${n(y - 9 * s)} L${n(x + 8 * s)},${n(y - 4.5 * s)} L${n(x + 8 * s)},${n(y + 4.5 * s)} L${n(x)},${n(y + 9 * s)} L${n(x - 8 * s)},${n(y + 4.5 * s)} L${n(x - 8 * s)},${n(y - 4.5 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(sw)}" stroke-linejoin="round"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(2.4 * s)}" fill="${accent}"/>`
    )
  if (k === 'react')
    return (
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(9 * s)}" ry="${n(3.4 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.3 * s)}" transform="rotate(60 ${n(x)} ${n(y)})"/>` +
      `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(9 * s)}" ry="${n(3.4 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.3 * s)}" transform="rotate(-60 ${n(x)} ${n(y)})"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(2 * s)}" fill="${accent}"/>`
    )
  if (k === 'vite')
    return (
      `<path d="M${n(x)},${n(y - 9 * s)} L${n(x + 9 * s)},${n(y + 8 * s)} L${n(x - 9 * s)},${n(y + 8 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(sw)}" stroke-linejoin="round"/>` +
      `<path d="M${n(x)},${n(y - 5 * s)} L${n(x + 4 * s)},${n(y + 3 * s)} L${n(x)},${n(y + s)} L${n(x - 4 * s)},${n(y + 3 * s)} Z" fill="${accent}"/>`
    )
  if (k === 'postgresql' || k === 'postgres')
    return (
      `<ellipse cx="${n(x)}" cy="${n(y - 7 * s)}" rx="${n(7 * s)}" ry="${n(3 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<path d="M${n(x - 7 * s)},${n(y - 7 * s)} L${n(x - 7 * s)},${n(y + 5 * s)} A7,3 0 0 0 ${n(x + 7 * s)},${n(y + 5 * s)} L${n(x + 7 * s)},${n(y - 7 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>`
    )
  if (k === 'docker')
    return (
      `<rect x="${n(x - 6 * s)}" y="${n(y - 8 * s)}" width="${n(12 * s)}" height="${n(6 * s)}" rx="${n(1.5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>` +
      `<rect x="${n(x - 6 * s)}" y="${n(y - s)}" width="${n(12 * s)}" height="${n(6 * s)}" rx="${n(1.5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>` +
      `<rect x="${n(x - 6 * s)}" y="${n(y + 6 * s)}" width="${n(12 * s)}" height="${n(6 * s)}" rx="${n(1.5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>`
    )
  if (k === 'vercel')
    return `<path d="M${n(x)},${n(y - 9 * s)} L${n(x + 9 * s)},${n(y + 8 * s)} L${n(x - 9 * s)},${n(y + 8 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(sw)}" stroke-linejoin="round"/>`
  if (k === 'render')
    return (
      `<rect x="${n(x - 7 * s)}" y="${n(y - 7 * s)}" width="${n(14 * s)}" height="${n(14 * s)}" rx="${n(4 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<rect x="${n(x - 3 * s)}" y="${n(y - 3 * s)}" width="${n(6 * s)}" height="${n(6 * s)}" rx="${n(2 * s)}" fill="${accent}"/>`
    )
  if (k === 'cloudflare')
    return `<path d="M${n(x - 8 * s)},${n(y + 3 * s)} A6,6 0 0 1 ${n(x - 2 * s)},${n(y - 5 * s)} A7,7 0 0 1 ${n(x + 4 * s)},${n(y - 5 * s)} A6,6 0 0 1 ${n(x + 8 * s)},${n(y + 3 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linejoin="round"/>`
  if (k === 'star') return `<polygon points="${starPts(x, y, 8 * s)}" fill="${accent}"/>`
  if (k === 'committer') return spiderEmblem(x, y, 0.5 * s, accent)
  if (k === 'pullreq')
    return (
      `<circle cx="${n(x - 7 * s)}" cy="${n(y - 7 * s)}" r="${n(3.2 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<circle cx="${n(x + 7 * s)}" cy="${n(y - 7 * s)}" r="${n(3.2 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<path d="M${n(x - 7 * s)},${n(y - 3.8 * s)} L${n(x - 7 * s)},${n(y + 5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<path d="M${n(x + 7 * s)},${n(y - 3.8 * s)} L${n(x + 7 * s)},${n(y + s)} C${n(x + 7 * s)},${n(y + 5 * s)} ${n(x + 3 * s)},${n(y + 7 * s)} ${n(x - s)},${n(y + 7 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}"/>` +
      `<path d="M${n(x - 7 * s)},${n(y + 5 * s)} L${n(x - 10 * s)},${n(y + 2 * s)} M${n(x - 7 * s)},${n(y + 5 * s)} L${n(x - 4 * s)},${n(y + 2 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linecap="round"/>`
    )
  if (k === 'issues')
    return (
      `<path d="M${n(x)},${n(y - 9 * s)} L${n(x + 8 * s)},${n(y - 4 * s)} L${n(x + 8 * s)},${n(y + 2 * s)} C${n(x + 8 * s)},${n(y + 6 * s)} ${n(x + 4 * s)},${n(y + 9 * s)} ${n(x)},${n(y + 10 * s)} C${n(x - 4 * s)},${n(y + 9 * s)} ${n(x - 8 * s)},${n(y + 6 * s)} ${n(x - 8 * s)},${n(y + 2 * s)} L${n(x - 8 * s)},${n(y - 4 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linejoin="round"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(1.8 * s)}" fill="${accent}"/>`
    )
  if (k === 'lang')
    return (
      `<path d="M${n(x - 6 * s)},${n(y - 8 * s)} C${n(x - 2 * s)},${n(y - 4 * s)} ${n(x - 2 * s)},${n(y + 4 * s)} ${n(x - 6 * s)},${n(y + 8 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linecap="round"/>` +
      `<path d="M${n(x + 6 * s)},${n(y - 8 * s)} C${n(x + 2 * s)},${n(y - 4 * s)} ${n(x + 2 * s)},${n(y + 4 * s)} ${n(x + 6 * s)},${n(y + 8 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linecap="round"/>` +
      `<circle cx="${n(x - 4 * s)}" cy="${n(y - 4 * s)}" r="${n(2 * s)}" fill="${accent}"/>` +
      `<circle cx="${n(x + 4 * s)}" cy="${n(y + 4 * s)}" r="${n(2 * s)}" fill="${accent}"/>`
    )
  if (k === 'repo')
    return `<path d="M${n(x - 9 * s)},${n(y - 6 * s)} L${n(x - 9 * s)},${n(y + 7 * s)} L${n(x + 9 * s)},${n(y + 7 * s)} L${n(x + 9 * s)},${n(y - 3 * s)} L${n(x + 2 * s)},${n(y - 3 * s)} L${n(x)},${n(y - 6 * s)} Z" fill="none" stroke="${accent}" stroke-width="${n(1.6 * s)}" stroke-linejoin="round"/>`
  if (k === 'followers')
    return (
      `<circle cx="${n(x - 8 * s)}" cy="${n(y)}" r="${n(3 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>` +
      `<circle cx="${n(x + 8 * s)}" cy="${n(y)}" r="${n(3 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>` +
      `<circle cx="${n(x)}" cy="${n(y - 8 * s)}" r="${n(3 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>` +
      `<path d="M${n(x - 5 * s)},${n(y - 1.6 * s)} L${n(x - 3 * s)},${n(y - 6 * s)} M${n(x + 5 * s)},${n(y - 1.6 * s)} L${n(x + 3 * s)},${n(y - 6 * s)} M${n(x - 4 * s)},${n(y + s)} L${n(x + 4 * s)},${n(y + s)}" fill="none" stroke="${accent}" stroke-width="${n(1.5 * s)}"/>`
    )
  if (k === 'time')
    return (
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(8.5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.7 * s)}"/>` +
      `<path d="M${n(x)},${n(y - 5 * s)} L${n(x)},${n(y)} L${n(x + 3.5 * s)},${n(y + 2.5 * s)}" fill="none" stroke="${accent}" stroke-width="${n(1.7 * s)}" stroke-linecap="round"/>`
    )
  // Monograms: brands simple-icons removed, plus common GitHub languages that
  // have no brand path. Glyph label is capped so it fits a 92px tile.
  if (k === 'aws') return glyphText(x, y + 6 * s, 13 * s, accent, 'AWS')
  if (k === 'vscode') return glyphText(x, y + 6 * s, 13 * s, accent, 'VS')
  if (k === 'powerbi') return glyphText(x, y + 6 * s, 14 * s, accent, 'BI')
  if (k === 'matplotlib') return glyphText(x, y + 6 * s, 11 * s, accent, 'PLOT')
  if (k === 'playwright') return glyphText(x, y + 6 * s, 13 * s, accent, 'PW')
  if (k === 'go' || k === 'golang') return glyphText(x, y + 6 * s, 13 * s, accent, 'GO')
  if (k === 'rust') return glyphText(x, y + 6 * s, 10 * s, accent, 'RUST')
  if (k === 'java') return glyphText(x, y + 6 * s, 11 * s, accent, 'JAVA')
  if (k === 'kotlin') return glyphText(x, y + 6 * s, 13 * s, accent, 'KT')
  if (k === 'swift') return glyphText(x, y + 6 * s, 10 * s, accent, 'SWIFT')
  if (k === 'php') return glyphText(x, y + 6 * s, 13 * s, accent, 'PHP')
  if (k === 'ruby') return glyphText(x, y + 6 * s, 13 * s, accent, 'RB')
  if (k === 'c' || k === 'objective-c') return glyphText(x, y + 6 * s, 13 * s, accent, 'C')
  if (k === 'cpp' || k === 'c++') return glyphText(x, y + 6 * s, 12 * s, accent, 'C++')
  if (k === 'csharp' || k === 'c#') return glyphText(x, y + 6 * s, 12 * s, accent, 'C#')
  if (k === 'sql') return glyphText(x, y + 6 * s, 12 * s, accent, 'SQL')
  if (k === 'shell' || k === 'bash') return glyphText(x, y + 6 * s, 13 * s, accent, 'SH')
  if (k === 'scala') return glyphText(x, y + 6 * s, 11 * s, accent, 'SCALA')
  return ''
}

function glyphText(x: number, y: number, size: number, accent: string, text: string): string {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="${FONT_MONO}" font-size="${size.toFixed(1)}" font-weight="bold" fill="${accent}">${text}</text>`
}

// GitHub `language` field → vendored brand slug (only the icons we ship).
const LANGUAGE_SLUGS: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  html: 'html5',
  css: 'css3',
  'jupyter notebook': 'jupyter',
  jupyter: 'jupyter',
  dockerfile: 'docker',
  docker: 'docker',
  shell: '',
  'html/css': 'html5',
}

/** Match a GitHub language name to a brand slug, or null. */
export function matchLanguage(name: string): string | null {
  const slug = LANGUAGE_SLUGS[name.trim().toLowerCase()]
  return slug || null
}

/** Lowercased, dot-stripped key used to try the geometric glyph set. */
export function languageGlyphKey(name: string): string {
  return name.toLowerCase().replace(/[.\s]/g, '')
}

/** Whether a language name can be drawn as a geometric glyph. */
export function hasGlyph(name: string): boolean {
  return iconGlyph(languageGlyphKey(name), 0, 0, C.WHITE, 1) !== ''
}
