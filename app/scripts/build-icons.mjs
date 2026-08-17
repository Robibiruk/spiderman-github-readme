// Vendor step for thesvg (CC0) brand paths bundled into
// src/lib/icons.json. Runs from the app/ dir: `npm run build:icons`.
//
// Expects the `@thesvg/icons` package installed (npm i thesvg). Each icon
// module under node_modules/@thesvg/icons/dist/<slug>.js exports:
//   slug, title, hex, svg, variants.{ default, mono, wordmark }, license, url
// We write ALL available icons that map to our toolbox catalog into
// src/lib/icons.json, pulling the brand hex + the 24×24 "mono" path.
// Slugs that don't exist in thesvg fall back to the geometric glyph renderer
// in icons.ts (text labels).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'src', 'lib', 'icons.json')

// Full toolbox catalog from arsenal.ts — every slug the Web Arsenal can
// render. 141 of these have thesvg icons; 3 (amazondynamodb,
// adobepremierepro, adobexd) don't exist in thesvg and fall back to glyphs.
const ALLOWLIST = [
  // ── Programming Languages ──────────────────────────────────────────────
  'python',
  'typescript',
  'javascript',
  'html5',
  'css3',
  'cplusplus',
  'c',
  'csharp',
  'go',
  'rust',
  'java',
  'kotlin',
  'swift',
  'dart',
  'ruby',
  'php',
  'crystal',
  'haskell',
  'elixir',
  'clojure',
  'gleam',
  'lua',
  'zig',
  'r',
  'fsharp',
  'd',
  'haxe',
  'webassembly',

  // ── AI · ML · DATA ─────────────────────────────────────────────────────
  'tensorflow',
  'pytorch',
  'langchain',
  'opencv',
  'huggingface',
  'scikitlearn',
  'numpy',
  'pandas',
  'jupyter',
  'openrouter',
  'matplotlib',
  'powerbi',          // @thesvg module: microsoft-power-bi
  'kaggle',
  'matlab',
  'mlflow',
  'apacheairflow',
  'dbt',
  'grafana',
  'prometheus',
  'opentelemetry',
  'dvc',

  // ── Backend ────────────────────────────────────────────────────────────
  'fastapi',
  'nodedotjs',
  'express',
  'graphql',
  'django',
  'laravel',
  'phoenixframework',
  'flutter',

  // ── Frontend / Web / Mobile ────────────────────────────────────────────
  'react',
  'nextdotjs',
  'angular',
  'vue',
  'svelte',
  'astro',
  'tailwindcss',
  'bootstrap',
  'sass',
  'vite',
  'bun',
  'alpinejs',

  // ── Databases ──────────────────────────────────────────────────────────
  'postgresql',
  'mongodb',
  'mysql',
  'sqlite',
  'redis',
  'apachecassandra',
  'amazondynamodb',   // no thesvg icon — falls back to glyph
  'neon',
  'supabase',
  'appwrite',
  'firebase',

  // ── Tools · DevOps · OS · IDE · Design · Social (→ 'tools') ─────────────
  'docker',
  'kubernetes',
  'git',
  'github',
  'gitlab',
  'githubactions',
  'jenkins',
  'amazonaws',
  'googlecloud',
  'microsoftazure',
  'netlify',
  'cloudflare',
  'terraform',
  'ansible',
  'circleci',
  'heroku',
  'vercel',
  'railway',
  'hasura',
  'render',
  'linux',
  'ubuntu',
  'debian',
  'archlinux',
  'apple',
  'windows',
  'arduino',
  'raspberrypi',
  'godotengine',
  'unity',
  'unrealengine',
  'visualstudiocode',
  'visualstudio',
  'sublimetext',
  'vim',
  'neovim',
  'emacs',
  'clion',
  'pycharm',
  'intellijidea',
  'postman',
  'npm',
  'selenium',
  'playwright',
  'streamlit',
  'figma',
  'blender',
  'autodesk',
  'adobephotoshop',
  'adobeillustrator',
  'adobeaftereffects',
  'adobepremierepro', // no thesvg icon — falls back to glyph
  'adobexd',          // no thesvg icon — falls back to glyph
  'obsidian',
  'notion',
  'discord',
  'stackoverflow',
  'bitbucket',
  'instagram',
  'linkedin',
  'x',
  'medium',
  // TOOL_CATALOG additions (missing from previous ALLOWLIST)
  'aws',
  'vscode',
]

const ICONS_DIR = join(here, '..', 'node_modules', '@thesvg', 'icons', 'dist')

// Alias mapping: our internal toolbox slug -> the @thesvg/icons module name.
// The @thesvg/icons package ships modules with hyphenated names; we map our
// internal keys to those names.
const ALIAS = {
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
  powerbi: 'microsoft-power-bi',
  vscode: 'visual-studio-code',
  stackoverflow: 'stack-overflow',
  cplusplus: 'cplusplus',
  csharp: 'csharp',
  nextdotjs: 'nextdotjs',
  nodedotjs: 'nodedotjs',
  netlify: 'netlify',
}

/**
 * Read a thesvg icon module and extract the icon SVG.
 * Strategy:
 *   1. Prefer the "mono" variant — it has viewBox="0 0 24 24" and a single
 *      <path d="..."/>. We pair it with the `hex` export for a clean brand fill.
 *   2. Fall back to the "default" variant — has baked-in brand colors but
 *      often in a non-24×24 viewBox. We store it as-is with the original viewBox.
 * This gives us the best rendering: mono icons scale perfectly, default icons
 * retain their multi-color brand identity.
 */
function iconSource(slug) {
  const file = join(ICONS_DIR, `${slug}.js`)
  if (!existsSync(file)) return { title: null, svg: null, mono: false }
  try {
    const raw = readFileSync(file, 'utf8')
    const titleMatch = raw.match(/export const title = "([^"]+)"/)
    const hexMatch = raw.match(/export const hex = "([^"]+)"/)
    const hex = hexMatch?.[1] ?? null

    // Try mono variant first (viewBox=24×24, single path)
    const monoMatch = raw.match(/"mono": `([^`]+)`/s)
    if (monoMatch) {
      const mono = monoMatch[1]
      const pathMatch = mono.match(/<path[^>]*d="([^"]*)"/)
      const path = pathMatch?.[1] ?? null
      if (path) {
        return {
          title: titleMatch?.[1] ?? null,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="#${hex || '000000'}"/></svg>`,
          mono: true,
        }
      }
    }

    // Fall back to default variant (baked-in brand colors)
    const defaultMatch = raw.match(/"default": `([^`]+)`/s)
    if (defaultMatch) {
      return {
        title: titleMatch?.[1] ?? null,
        svg: defaultMatch[1],
        mono: false,
      }
    }

    // Last resort: use the svg export
    const svgMatch = raw.match(/export const svg = `([^`]+)`/s)
    if (svgMatch) {
      return {
        title: titleMatch?.[1] ?? null,
        svg: svgMatch[1],
        mono: false,
      }
    }

    return { title: titleMatch?.[1] ?? null, svg: null, mono: false }
  } catch {
    return { title: null, svg: null, mono: false }
  }
}

const out = ALLOWLIST.map((slug) => {
  const src = ALIAS[slug] ?? slug
  const icon = iconSource(src)
  if (!icon.svg) {
    return {
      slug,
      label: slug.toUpperCase(),
      svg: null,
    }
  }
  return {
    slug,
    label: String(icon.title ?? slug).toUpperCase(),
    svg: icon.svg,
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')

const withPath = out.filter(i => i.svg)
const withoutPath = out.filter(i => !i.svg)
console.log(`Wrote ${out.length} icons to ${OUT}`)
console.log(`  ${withPath.length} with brand SVG (from @thesvg/icons)`)
console.log(`  ${withoutPath.length} without SVG (fall back to glyph): ${withoutPath.map(i => i.slug).join(', ')}`)
