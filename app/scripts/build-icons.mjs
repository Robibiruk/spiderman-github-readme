// Vendor step for the simple-icons (CC0) brand paths bundled into
// src/lib/icons.json. Runs from the app/ dir: `npm run build:icons`.
//
// Expects a source JSON with the simple-icons array shape, one entry per
// icon: { title, slug, hex, path }. It can come from a local checkout of
// simple-icons (icons.json) or from the npm package; we keep only the
// slugs in ALLOWLIST and write the compact subset to src/lib/icons.json.
//
// The checked-in icons.json is already committed, so this script is only
// needed when bumping the icon set.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'src', 'lib', 'icons.json')

// Icons the arsenal / language matcher / tool picker can render.
// Grouped by arsenal category for readability; order is not significant.
const ALLOWLIST = [
  // core languages
  'python',
  'typescript',
  'javascript',
  'html5',
  'css3',
  // AI & ML · data
  'jupyter',
  'openrouter',
  'pytorch',
  'tensorflow',
  'langchain',
  'opencv',
  'numpy',
  'pandas',
  'scikitlearn',
  'huggingface',
  // backend
  'fastapi',
  'nodedotjs',
  'express',
  'docker',
  'graphql',
  // frontend
  'react',
  'nextdotjs',
  'vite',
  'tailwindcss',
  'bootstrap',
  // databases
  'postgresql',
  'mongodb',
  'mysql',
  'redis',
  // tools & dev-ops
  'git',
  'streamlit',
  'postman',
  'selenium',
  'vercel',
  'render',
  'cloudflare',
  'githubactions',
]

const SOURCES = [
  join(here, '..', 'node_modules', 'simple-icons', 'data', 'simple-icons.json'),
  join(here, '..', 'node_modules', 'simple-icons', 'icons.json'),
  join(here, '..', 'icons.json'),
]

function load() {
  for (const p of SOURCES) {
    try {
      const raw = readFileSync(p, 'utf8')
      const json = JSON.parse(raw)
      const arr = Array.isArray(json)
        ? json
        : json.default && Array.isArray(json.default)
          ? json.default
          : null
      if (arr) return arr
    } catch {
      /* try next source */
    }
  }
  throw new Error(
    'simple-icons source not found. Install simple-icons (npm i -D simple-icons) or drop icons.json next to this script.',
  )
}

const all = load()
const bySlug = new Map(all.map((i) => [String(i.slug), i]))

// simple-icons renamed a few brand slugs over time; we keep our own stable
// internal keys (used across icons.ts / render.ts) and map to the current
// simple-icons name when vendoring.
const ALIAS = { css3: 'css' }

const ICONS_DIR = join(here, '..', 'node_modules', 'simple-icons', 'icons')

// Current simple-icons splits path data out of data/simple-icons.json into
// per-icon SVGs (icons/<slug>.svg). Read title + path from there when present;
// fall back to the JSON for title (hex always comes from the JSON).
function svgSource(slug) {
  const file = join(ICONS_DIR, `${slug}.svg`)
  if (!existsSync(file)) return { title: null, path: null }
  try {
    const svg = readFileSync(file, 'utf8')
    return {
      title: svg.match(/<title>(.*?)<\/title>/)?.[1] ?? null,
      path: svg.match(/<path d="([^"]*)"/)?.[1] ?? null,
    }
  } catch {
    return { title: null, path: null }
  }
}

const out = ALLOWLIST.map((slug) => {
  const src = ALIAS[slug] ?? slug
  const icon = bySlug.get(src)
  if (!icon) throw new Error(`Allowlisted slug "${slug}" (${src}) not present in simple-icons`)
  const svg = svgSource(src)
  if (!svg.path) throw new Error(`No path data found for allowlisted slug "${slug}" (${src})`)
  return {
    slug,
    label: String(svg.title ?? icon.title ?? slug).toUpperCase(),
    hex: icon.hex,
    path: svg.path,
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`Wrote ${out.length} icons to ${OUT}`)
