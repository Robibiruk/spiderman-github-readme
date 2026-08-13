// Master technology registry — the "Web Arsenal" catalog.
//
// Every entry maps a human label to a simple-icons slug (used for the live
// brand-icon loader) and a fixed arsenal category. GitHub can report real
// language bytes but never the surrounding tooling, so this registry pairs
// auto-detected languages with a curated, self-declared / auto-detected tool
// set. Shared by the React editor and the offline renderers.
//
// Category ids MUST stay within ArsenalCat: langs | ai | backend | frontend |
// db | tools (the renderer lays out a fixed six-panel grid).

import type { ArsenalCat } from './arsenal'

export interface RegistryEntry {
  slug: string // simple-icons slug (also the bundled-icon key)
  label: string // display name (title case)
  cat: ArsenalCat
}

// Order within a category is preserved for the picker.
export const REGISTRY: RegistryEntry[] = [
  // ── Programming Languages ──────────────────────────────────────────────
  { slug: 'python', label: 'Python', cat: 'langs' },
  { slug: 'cplusplus', label: 'C++', cat: 'langs' },
  { slug: 'c', label: 'C', cat: 'langs' },
  { slug: 'csharp', label: 'C#', cat: 'langs' },
  { slug: 'javascript', label: 'JavaScript', cat: 'langs' },
  { slug: 'typescript', label: 'TypeScript', cat: 'langs' },
  { slug: 'go', label: 'Go', cat: 'langs' },
  { slug: 'rust', label: 'Rust', cat: 'langs' },
  { slug: 'java', label: 'Java', cat: 'langs' },
  { slug: 'kotlin', label: 'Kotlin', cat: 'langs' },
  { slug: 'swift', label: 'Swift', cat: 'langs' },
  { slug: 'dart', label: 'Dart', cat: 'langs' },
  { slug: 'ruby', label: 'Ruby', cat: 'langs' },
  { slug: 'php', label: 'PHP', cat: 'langs' },
  { slug: 'crystal', label: 'Crystal', cat: 'langs' },
  { slug: 'haskell', label: 'Haskell', cat: 'langs' },
  { slug: 'elixir', label: 'Elixir', cat: 'langs' },
  { slug: 'clojure', label: 'Clojure', cat: 'langs' },
  { slug: 'gleam', label: 'Gleam', cat: 'langs' },
  { slug: 'lua', label: 'Lua', cat: 'langs' },
  { slug: 'zig', label: 'Zig', cat: 'langs' },
  { slug: 'r', label: 'R', cat: 'langs' },
  { slug: 'fsharp', label: 'F#', cat: 'langs' },
  { slug: 'd', label: 'D', cat: 'langs' },
  { slug: 'haxe', label: 'Haxe', cat: 'langs' },
  { slug: 'webassembly', label: 'WebAssembly', cat: 'langs' },

  // ── AI · ML · DATA ─────────────────────────────────────────────────────
  { slug: 'tensorflow', label: 'TensorFlow', cat: 'ai' },
  { slug: 'pytorch', label: 'PyTorch', cat: 'ai' },
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
  { slug: 'kaggle', label: 'Kaggle', cat: 'ai' },
  { slug: 'matlab', label: 'MATLAB', cat: 'ai' },
  { slug: 'mlflow', label: 'MLflow', cat: 'ai' },
  { slug: 'apacheairflow', label: 'Apache Airflow', cat: 'ai' },
  { slug: 'dbt', label: 'dbt', cat: 'ai' },
  { slug: 'grafana', label: 'Grafana', cat: 'ai' },
  { slug: 'prometheus', label: 'Prometheus', cat: 'ai' },
  { slug: 'opentelemetry', label: 'OpenTelemetry', cat: 'ai' },
  { slug: 'dvc', label: 'DVC', cat: 'ai' },

  // ── Backend ────────────────────────────────────────────────────────────
  { slug: 'fastapi', label: 'FastAPI', cat: 'backend' },
  { slug: 'nodedotjs', label: 'Node.js', cat: 'backend' },
  { slug: 'express', label: 'Express', cat: 'backend' },
  { slug: 'graphql', label: 'GraphQL', cat: 'backend' },
  { slug: 'django', label: 'Django', cat: 'backend' },
  { slug: 'laravel', label: 'Laravel', cat: 'backend' },
  { slug: 'phoenixframework', label: 'Phoenix', cat: 'backend' },
  { slug: 'flutter', label: 'Flutter', cat: 'backend' },

  // ── Frontend / Web / Mobile ────────────────────────────────────────────
  { slug: 'html5', label: 'HTML5', cat: 'frontend' },
  { slug: 'css3', label: 'CSS3', cat: 'frontend' },
  { slug: 'react', label: 'React', cat: 'frontend' },
  { slug: 'nextdotjs', label: 'Next.js', cat: 'frontend' },
  { slug: 'angular', label: 'Angular', cat: 'frontend' },
  { slug: 'vue', label: 'Vue.js', cat: 'frontend' },
  { slug: 'svelte', label: 'Svelte', cat: 'frontend' },
  { slug: 'astro', label: 'Astro', cat: 'frontend' },
  { slug: 'tailwindcss', label: 'Tailwind CSS', cat: 'frontend' },
  { slug: 'bootstrap', label: 'Bootstrap', cat: 'frontend' },
  { slug: 'sass', label: 'Sass', cat: 'frontend' },
  { slug: 'vite', label: 'Vite', cat: 'frontend' },
  { slug: 'bun', label: 'Bun', cat: 'frontend' },
  { slug: 'alpinejs', label: 'Alpine.js', cat: 'frontend' },

  // ── Databases ──────────────────────────────────────────────────────────
  { slug: 'postgresql', label: 'PostgreSQL', cat: 'db' },
  { slug: 'mongodb', label: 'MongoDB', cat: 'db' },
  { slug: 'mysql', label: 'MySQL', cat: 'db' },
  { slug: 'sqlite', label: 'SQLite', cat: 'db' },
  { slug: 'redis', label: 'Redis', cat: 'db' },
  { slug: 'apachecassandra', label: 'Apache Cassandra', cat: 'db' },
  { slug: 'amazondynamodb', label: 'Amazon DynamoDB', cat: 'db' },
  { slug: 'neon', label: 'Neon', cat: 'db' },
  { slug: 'supabase', label: 'Supabase', cat: 'db' },
  { slug: 'appwrite', label: 'Appwrite', cat: 'db' },
  { slug: 'firebase', label: 'Firebase', cat: 'db' },

  // ── Tools · DevOps · OS · IDE · Design · Social (→ 'tools') ─────────────
  { slug: 'docker', label: 'Docker', cat: 'tools' },
  { slug: 'kubernetes', label: 'Kubernetes', cat: 'tools' },
  { slug: 'git', label: 'Git', cat: 'tools' },
  { slug: 'github', label: 'GitHub', cat: 'tools' },
  { slug: 'gitlab', label: 'GitLab', cat: 'tools' },
  { slug: 'githubactions', label: 'GitHub Actions', cat: 'tools' },
  { slug: 'jenkins', label: 'Jenkins', cat: 'tools' },
  { slug: 'amazonaws', label: 'AWS', cat: 'tools' },
  { slug: 'googlecloud', label: 'Google Cloud', cat: 'tools' },
  { slug: 'microsoftazure', label: 'Microsoft Azure', cat: 'tools' },
  { slug: 'netlify', label: 'Netlify', cat: 'tools' },
  { slug: 'cloudflare', label: 'Cloudflare', cat: 'tools' },
  { slug: 'terraform', label: 'Terraform', cat: 'tools' },
  { slug: 'ansible', label: 'Ansible', cat: 'tools' },
  { slug: 'circleci', label: 'CircleCI', cat: 'tools' },
  { slug: 'heroku', label: 'Heroku', cat: 'tools' },
  { slug: 'vercel', label: 'Vercel', cat: 'tools' },
  { slug: 'railway', label: 'Railway', cat: 'tools' },
  { slug: 'hasura', label: 'Hasura', cat: 'tools' },
  { slug: 'render', label: 'Render', cat: 'tools' },
  { slug: 'linux', label: 'Linux', cat: 'tools' },
  { slug: 'ubuntu', label: 'Ubuntu', cat: 'tools' },
  { slug: 'debian', label: 'Debian', cat: 'tools' },
  { slug: 'archlinux', label: 'Arch Linux', cat: 'tools' },
  { slug: 'apple', label: 'Apple', cat: 'tools' },
  { slug: 'windows', label: 'Windows', cat: 'tools' },
  { slug: 'arduino', label: 'Arduino', cat: 'tools' },
  { slug: 'raspberrypi', label: 'Raspberry Pi', cat: 'tools' },
  { slug: 'godotengine', label: 'Godot', cat: 'tools' },
  { slug: 'unity', label: 'Unity', cat: 'tools' },
  { slug: 'unrealengine', label: 'Unreal Engine', cat: 'tools' },
  { slug: 'visualstudiocode', label: 'VS Code', cat: 'tools' },
  { slug: 'visualstudio', label: 'Visual Studio', cat: 'tools' },
  { slug: 'sublimetext', label: 'Sublime Text', cat: 'tools' },
  { slug: 'vim', label: 'Vim', cat: 'tools' },
  { slug: 'neovim', label: 'Neovim', cat: 'tools' },
  { slug: 'emacs', label: 'Emacs', cat: 'tools' },
  { slug: 'clion', label: 'CLion', cat: 'tools' },
  { slug: 'pycharm', label: 'PyCharm', cat: 'tools' },
  { slug: 'intellijidea', label: 'IntelliJ IDEA', cat: 'tools' },
  { slug: 'postman', label: 'Postman', cat: 'tools' },
  { slug: 'npm', label: 'npm', cat: 'tools' },
  { slug: 'selenium', label: 'Selenium', cat: 'tools' },
  { slug: 'playwright', label: 'Playwright', cat: 'tools' },
  { slug: 'streamlit', label: 'Streamlit', cat: 'tools' },
  { slug: 'figma', label: 'Figma', cat: 'tools' },
  { slug: 'blender', label: 'Blender', cat: 'tools' },
  { slug: 'autodesk', label: 'Autodesk', cat: 'tools' },
  { slug: 'adobephotoshop', label: 'Photoshop', cat: 'tools' },
  { slug: 'adobeillustrator', label: 'Illustrator', cat: 'tools' },
  { slug: 'adobeaftereffects', label: 'After Effects', cat: 'tools' },
  { slug: 'adobepremierepro', label: 'Premiere Pro', cat: 'tools' },
  { slug: 'adobexd', label: 'Adobe XD', cat: 'tools' },
  { slug: 'obsidian', label: 'Obsidian', cat: 'tools' },
  { slug: 'notion', label: 'Notion', cat: 'tools' },
  { slug: 'discord', label: 'Discord', cat: 'tools' },
  { slug: 'stackoverflow', label: 'Stack Overflow', cat: 'tools' },
  { slug: 'bitbucket', label: 'Bitbucket', cat: 'tools' },
  { slug: 'instagram', label: 'Instagram', cat: 'tools' },
  { slug: 'linkedin', label: 'LinkedIn', cat: 'tools' },
  { slug: 'x', label: 'X', cat: 'tools' },
  { slug: 'medium', label: 'Medium', cat: 'tools' },
]

export const REGISTRY_BY_SLUG: Record<string, RegistryEntry> = Object.fromEntries(
  REGISTRY.map((r) => [r.slug, r]),
)

/** Group registry entries by category, preserving registry order. */
export function registryByCat(cats: { id: ArsenalCat; title: string }[]): Array<{
  id: ArsenalCat
  title: string
  entries: RegistryEntry[]
}> {
  return cats.map((c) => ({
    id: c.id,
    title: c.title,
    entries: REGISTRY.filter((r) => r.cat === c.id),
  }))
}
