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
// render. 112 of these have thesvg icons; 4 (powerbi, amazondynamodb,
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
 * Read a thesvg icon module and extract title, hex, and a 24×24 path.
 * We prefer the "mono" variant (24×24 viewBox) when present; otherwise we
 * fall back to the "default" variant and pull its first <path d>.
 */
function iconSource(slug) {
  const file = join(ICONS_DIR, `${slug}.js`)
  if (!existsSync(file)) return { title: null, hex: null, path: null }
  try {
    const raw = readFileSync(file, 'utf8')
    const titleMatch = raw.match(/export const title = "([^"]+)"/)
    const hexMatch = raw.match(/export const hex = "([^"]+)"/)
    const monoMatch = raw.match(/"mono": `([^`]+)`/s)
    const defaultMatch = raw.match(/"default": `([^`]+)`/s)

    let mono = monoMatch ? monoMatch[1] : null
    let fallback = defaultMatch ? defaultMatch[1] : null
    let used = mono
    if (!mono && fallback) used = fallback
    if (!used) return { title: titleMatch?.[1] ?? null, hex: hexMatch?.[1] ?? null, path: null }

    const pathMatch = used.match(/<path[^>]*d="([^"]*)"/)
    return {
      title: titleMatch?.[1] ?? null,
      hex: hexMatch?.[1] ?? null,
      path: pathMatch?.[1] ?? null,
    }
  } catch {
    return { title: null, hex: null, path: null }
  }
}

const out = ALLOWLIST.map((slug) => {
  const src = ALIAS[slug] ?? slug
  const icon = iconSource(src)
  if (!icon.path) {
    // This icon doesn't exist in thesvg (e.g. powerbi, adobexd). Write it
    // anyway with empty path so the system knows the slug is valid but falls
    // back to the geometric glyph renderer.
    return {
      slug,
      label: slug.toUpperCase(),
      hex: null,
      path: null,
    }
  }
  return {
    slug,
    label: String(icon.title ?? slug).toUpperCase(),
    hex: icon.hex,
    path: icon.path,
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')

const withPath = out.filter(i => i.path)
const withoutPath = out.filter(i => !i.path)
console.log(`Wrote ${out.length} icons to ${OUT}`)
console.log(`  ${withPath.length} with brand path (from @thesvg/icons)`)
console.log(`  ${withoutPath.length} without path (fall back to glyph): ${withoutPath.map(i => i.slug).join(', ')}`)
