// Live brand-icon loader with localStorage caching.
// Dynamically imports icon modules from @thesvg/icons via jsDelivr CDN and
// caches the rendered SVG indefinitely. Falls back to the vendored
// TECH_ICONS / geometric glyphs.

import { TECH_ICONS, iconGlyph } from './icons'
import { C } from './palette'

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@thesvg/icons@3.3.1/dist'
const CACHE_PREFIX = 'spidey-icon-'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// Alias mapping so our internal keys resolve to the slug @thesvg/icons ships.
// (mirror of the alias map in scripts/build-icons.mjs — keep in sync)
const ALIAS: Record<string, string> = {
  css3: 'css',
  scikitlearn: 'scikit-learn',
  huggingface: 'hugging-face',
  githubactions: 'github-actions',
  amazonaws: 'amazon-web-services',
  googlecloud: 'google-cloud',
  microsoftazure: 'microsoft-azure',
  visualstudiocode: 'visual-studio-code',
  visualstudio: 'visual-studio',
  sublimetext: 'sublime-text',
  intellijidea: 'intellij-idea',
  raspberrypi: 'raspberry-pi',
  godotengine: 'godot',
  unrealengine: 'unreal-engine',
  apachecassandra: 'apache-cassandra',
  amazondynamodb: 'amazon-dynamodb',
  adobephotoshop: 'photoshop',
  adobeillustrator: 'illustrator',
  adobeaftereffects: 'after-effects',
  adobepremierepro: 'premiere-pro',
  adobexd: 'adobe-xd',
  phoenixframework: 'phoenix',
  apacheairflow: 'apache-airflow',
  powerbi: 'powerbi',
  stackoverflow: 'stackoverflow',
  cplusplus: 'cplusplus',
  csharp: 'csharp',
  nextdotjs: 'nextdotjs',
  nodedotjs: 'nodedotjs',
}

interface CacheEntry {
  svg: string
  ts: number
}

/** Resolve an internal slug to the @thesvg/icons module name. */
function resolveSlug(slug: string): string {
  const aliased = ALIAS[slug] ?? slug
  return aliased.toLowerCase().replace(/\./g, '')
}

/** Read from localStorage cache. */
export function normSlug(slug: string): string {
  return slug.toLowerCase().replace(/\./g, '')
}

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
  const vendored = TECH_ICONS[norm]
  if (vendored && vendored.svg) {
    // Keep original viewBox — add/override width/height to 24 and preserveAspectRatio
    // so the browser scales it correctly to 24×24.
    let sized = vendored.svg
      .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid meet"')
    const hasWidth = /width="[^"]*"/.test(sized)
    const hasHeight = /height="[^"]*"/.test(sized)
    if (hasWidth) {
      sized = sized.replace(/width="[^"]*"/, 'width="24"')
    }
    if (hasHeight) {
      sized = sized.replace(/height="[^"]*"/, 'height="24"')
    }
    if (!hasWidth || !hasHeight) {
      sized = sized.replace('<svg', `<svg ${!hasWidth ? 'width="24" ' : ''}${!hasHeight ? 'height="24"' : ''}`)
    }
    const withNs = sized.includes('xmlns') ? sized : sized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    return withNs
  }
  // Then geometric glyph
  const glyph = iconGlyph(norm, 12, 12, C.WHITE, 1)
  if (glyph) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${glyph}</svg>`
  }
  // Final fallback: empty transparent square
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="transparent"/></svg>`
}

/**
 * Load an icon SVG (24×24 viewBox) for a given slug.
 *  - Checks localStorage first
 *  - Dynamically imports the @thesvg/icons module from jsDelivr if missing
 *  - Extracts the exported `svg` string (brand-coloured 256×256) and
 *    normalises it to a 24×24 viewBox for the tile renderer
 *  - Caches result
 *  - Always returns a valid SVG string (never throws)
 */
export async function loadIcon(slug: string): Promise<string> {
  const norm = normSlug(slug)
  const mod = resolveSlug(slug)

  // 1) Memory/LocalStorage cache
  const cached = getCached(norm)
  if (cached) return cached

  // 2) Try dynamic import from @thesvg/icons
  try {
    const module = await import(`${CDN_BASE}/${mod}.js`)
    const svg = module.svg
    if (svg && typeof svg === 'string') {
      // Keep original viewBox — add/override width/height to 24 and preserveAspectRatio
      // so the browser scales it correctly to 24×24.
      let sized = svg
        .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid meet"')
      const hasWidth = /width="[^"]*"/.test(sized)
      const hasHeight = /height="[^"]*"/.test(sized)
      if (hasWidth) {
        sized = sized.replace(/width="[^"]*"/, 'width="24"')
      }
      if (hasHeight) {
        sized = sized.replace(/height="[^"]*"/, 'height="24"')
      }
      if (!hasWidth || !hasHeight) {
        sized = sized.replace('<svg', `<svg ${!hasWidth ? 'width="24" ' : ''}${!hasHeight ? 'height="24"' : ''}`)
      }
      const withNs = sized.includes('xmlns') ? sized : sized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      setCached(norm, withNs)
      return withNs
    }
  } catch {
    // Network error / timeout / missing module — fall through
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
