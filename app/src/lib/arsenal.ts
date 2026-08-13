// Web Arsenal catalog. GitHub can report real language bytes but never the
// tooling (Postman, Power BI, VS Code…), so this module pairs auto-detected
// languages with a curated, vendored-icon tool picker. Shared by the React
// app, the offline renderers, and the Cloudflare Worker.

import type { LanguageShare } from './types'
import { C } from './palette'
import { matchLanguage, languageGlyphKey } from './icons'
import { REGISTRY, REGISTRY_BY_SLUG } from './registry'

export type ArsenalCat = 'langs' | 'ai' | 'backend' | 'frontend' | 'db' | 'tools'

export interface CatDef {
  id: ArsenalCat
  title: string
  color: string
}

// Fixed six-panel grid. Data-viz tools (Matplotlib, Power BI) fold under the
// AI · ML · DATA panel so the "tool network" always fits 3×2.
export const CATS: CatDef[] = [
  { id: 'langs', title: 'PROGRAMMING LANGUAGES', color: C.BLUE },
  { id: 'ai', title: 'AI · ML · DATA', color: C.GREEN },
  { id: 'backend', title: 'BACKEND', color: C.RED },
  { id: 'frontend', title: 'FRONTEND', color: C.BRIGHT },
  { id: 'db', title: 'DATABASES', color: C.MUTED },
  { id: 'tools', title: 'TOOLS & DEV-OPS', color: C.BLUE },
]

export interface ToolDef {
  slug: string // brand slug in TECH_ICONS, or a glyph key
  label: string // display name (title case)
  cat: ArsenalCat
}

// Order shown in the picker. Every slug has a vendored icon OR a glyph.
export const TOOL_CATALOG: ToolDef[] = [
  // AI · ML · DATA
  { slug: 'pytorch', label: 'PyTorch', cat: 'ai' },
  { slug: 'tensorflow', label: 'TensorFlow', cat: 'ai' },
  { slug: 'langchain', label: 'LangChain', cat: 'ai' },
  { slug: 'opencv', label: 'OpenCV', cat: 'ai' },
  { slug: 'huggingface', label: 'Hugging Face', cat: 'ai' },
  { slug: 'scikitlearn', label: 'Scikit-learn', cat: 'ai' },
  { slug: 'numpy', label: 'NumPy', cat: 'ai' },
  { slug: 'pandas', label: 'Pandas', cat: 'ai' },
  { slug: 'jupyter', label: 'Jupyter', cat: 'ai' },
  { slug: 'openrouter', label: 'OpenRouter', cat: 'ai' },
  { slug: 'matplotlib', label: 'Matplotlib', cat: 'ai' },
  { slug: 'powerbi', label: 'Power BI', cat: 'ai' },
  // backend
  { slug: 'fastapi', label: 'FastAPI', cat: 'backend' },
  { slug: 'nodedotjs', label: 'Node.js', cat: 'backend' },
  { slug: 'express', label: 'Express', cat: 'backend' },
  { slug: 'graphql', label: 'GraphQL', cat: 'backend' },
  // frontend
  { slug: 'react', label: 'React', cat: 'frontend' },
  { slug: 'nextdotjs', label: 'Next.js', cat: 'frontend' },
  { slug: 'vite', label: 'Vite', cat: 'frontend' },
  { slug: 'tailwindcss', label: 'Tailwind CSS', cat: 'frontend' },
  { slug: 'bootstrap', label: 'Bootstrap', cat: 'frontend' },
  // databases
  { slug: 'postgresql', label: 'PostgreSQL', cat: 'db' },
  { slug: 'mongodb', label: 'MongoDB', cat: 'db' },
  { slug: 'mysql', label: 'MySQL', cat: 'db' },
  { slug: 'redis', label: 'Redis', cat: 'db' },
  // tools & dev-ops
  { slug: 'docker', label: 'Docker', cat: 'tools' },
  { slug: 'git', label: 'Git', cat: 'tools' },
  { slug: 'vercel', label: 'Vercel', cat: 'tools' },
  { slug: 'render', label: 'Render', cat: 'tools' },
  { slug: 'cloudflare', label: 'Cloudflare', cat: 'tools' },
  { slug: 'githubactions', label: 'GitHub Actions', cat: 'tools' },
  { slug: 'streamlit', label: 'Streamlit', cat: 'tools' },
  { slug: 'postman', label: 'Postman', cat: 'tools' },
  { slug: 'selenium', label: 'Selenium', cat: 'tools' },
  { slug: 'aws', label: 'AWS', cat: 'tools' },
  { slug: 'vscode', label: 'VS Code', cat: 'tools' },
  { slug: 'playwright', label: 'Playwright', cat: 'tools' },
]

export const TOOLS_BY_SLUG: Record<string, ToolDef> = Object.fromEntries(
  TOOL_CATALOG.map((t) => [t.slug, t]),
)

/** Full catalog (all 160+ entries) grouped by category — used by the picker. */
export const PICKER_CATALOG = REGISTRY

export interface ArsenalItem {
  slug: string // brand slug if TECH_ICONS ships it, else a glyph key
  label: string // display label, UPPERCASE for the SVG
  cat: ArsenalCat
}

// GitHub `language` field → arsenal category. Languages not listed here
// (JavaScript, TypeScript, Python…) are, by definition, programming languages.
const LANG_CAT: Record<string, ArsenalCat> = {
  html: 'frontend',
  'html/css': 'frontend',
  css: 'frontend',
  scss: 'frontend',
  sass: 'frontend',
  less: 'frontend',
  sql: 'db',
  plpgsql: 'db',
  'jupyter notebook': 'ai',
  jupyter: 'ai',
  dockerfile: 'tools',
  docker: 'tools',
  shell: 'tools',
  makefile: 'tools',
  powershell: 'tools',
}

/** Merge real language bytes (pct ≥ 1.5, first) with picked tools, deduped. */
export function buildArsenal(
  languages: LanguageShare[] | undefined,
  picks: string[],
): ArsenalItem[] {
  const items: ArsenalItem[] = []
  const seen = new Set<string>()
  const lower = (n: string) => n.trim().toLowerCase()
  for (const l of languages ?? []) {
    if (l.pct < 1.5) continue
    const slug = matchLanguage(l.name) ?? languageGlyphKey(l.name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    items.push({ slug, label: l.name.toUpperCase(), cat: LANG_CAT[lower(l.name)] ?? 'langs' })
  }
  for (const p of picks) {
    const t = REGISTRY_BY_SLUG[p] ?? TOOLS_BY_SLUG[p]
    if (!t || seen.has(t.slug)) continue
    seen.add(t.slug)
    items.push({ slug: t.slug, label: t.label.toUpperCase(), cat: t.cat })
  }
  return items
}

/** Detect top languages from GitHub data (pct ≥ 1.5), mapped to registry slugs. */
export function detectLanguages(languages: LanguageShare[] | undefined): ArsenalItem[] {
  const items: ArsenalItem[] = []
  const seen = new Set<string>()
  for (const l of languages ?? []) {
    if (l.pct < 1.5) continue
    const slug = matchLanguage(l.name) ?? languageGlyphKey(l.name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    items.push({ slug, label: l.name.toUpperCase(), cat: LANG_CAT[l.name.trim().toLowerCase()] ?? 'langs' })
  }
  return items
}
