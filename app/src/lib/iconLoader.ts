// Live brand-icon loader with localStorage caching.
// Fetches SVG from jsDelivr CDN (simple-icons@latest) and caches indefinitely.
// Falls back to the vendored TECH_ICONS / geometric glyphs.

import { TECH_ICONS, iconGlyph } from './icons'
import { C } from './palette'

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons'
const CACHE_PREFIX = 'spidey-icon-'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface CacheEntry {
  svg: string
  ts: number
}

/** Normalize a simple-icons slug (lowercase, no dots). */
export function normSlug(slug: string): string {
  return slug.toLowerCase().replace(/\./g, '')
}

/** Read from localStorage cache. */
function getCached(slug: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + slug)
      return null
    }
    return entry.svg
  } catch {
    return null
  }
}

/** Write to localStorage cache. */
function setCached(slug: string, svg: string): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + slug,
      JSON.stringify({ svg, ts: Date.now() }),
    )
  } catch {
    // Quota exceeded — ignore
  }
}

/** Fallback SVG from vendored icons or glyph. */
function fallbackSvg(slug: string): string {
  const norm = normSlug(slug)
  // Try vendored brand path first
  const vendored = TECH_ICONS[norm]
  if (vendored) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${vendored.path ? `<path d="${vendored.path}" fill="${vendored.hex || C.WHITE}"/>` : ''}</svg>`
  }
  // Then geometric glyph
  const glyph = iconGlyph(norm, 12, 12, C.WHITE, 1)
  if (glyph) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${glyph}</svg>`
  }
  // Final fallback: empty transparent square
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="transparent"/></svg>`
}

/** Load an icon SVG (24×24 viewBox) for a given slug.
 *  - Checks localStorage first
 *  - Fetches from jsDelivr CDN if missing
 *  - Caches result
 *  - Always returns a valid SVG string (never throws) */
export async function loadIcon(slug: string): Promise<string> {
  const norm = normSlug(slug)

  // 1) Memory/LocalStorage cache
  const cached = getCached(norm)
  if (cached) return cached

  // 2) Try CDN (simple-icons)
  try {
    const timeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal })
      .timeout
    const signal = timeout ? timeout(15_000) : undefined
    const res = await fetch(`${CDN_BASE}/${norm}.svg`, { signal })
    if (res.ok) {
      const text = await res.text()
      // simple-icons SVGs are already 24×24 viewBox; just ensure xmlns
      const svg = text.includes('xmlns')
        ? text
        : text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      setCached(norm, svg)
      return svg
    }
  } catch {
    // Network error / timeout / CORS — fall through
  }

  // 3) Fallback to vendored / glyph
  const fb = fallbackSvg(norm)
  setCached(norm, fb) // cache the fallback too (avoid re-fetch)
  return fb
}

/** Preload a batch of icons (fire-and-forget, no await needed). */
export function preloadIcons(slugs: string[]): void {
  for (const s of slugs) {
    void loadIcon(s)
  }
}

/** Clear the entire icon cache (dev tool). */
export function clearIconCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    for (const k of keys) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}