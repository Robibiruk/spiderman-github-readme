# 🕷️ Spider-Man GitHub Profile Generator

Turn your GitHub profile into an animated, Spider-Verse comic-book README — with zero backend and two ways to keep the stats fresh.

```
┌────────────────────────────────────────────────────────────┐
│   GENERATE AT  →  Vercel React app (client-side only)      │
│   DATA SOURCE  →  api.github.com (+ optional read-only PAT)│
│   OUTPUT       →  .zip with README.md + animated SVGs      │
│   STAYS FRESH  →  GitHub Action  and/or  Cloudflare Worker │
└────────────────────────────────────────────────────────────┘
```

## What you get

- **9 animated SVGs** — hero, spider-sense, hero stats, web streak, web arsenal, 52-week swing, achievements, divider, footer. All motion is SMIL/CSS-in-SVG (no `<script>`), so animations render inside GitHub README images.
- **Live GitHub stats** — commits, PRs, streak, contributions calendar, language share. Fetched client-side from the GitHub REST + GraphQL APIs. Paste an optional read-only PAT to unlock pinned repositories and your real contribution graph; the token never leaves your browser.
- **Web Arsenal that categorizes itself** — real language bytes auto-sort into *Programming Languages / AI·ML·DATA / Backend / Frontend / Databases / Tools & DevOps*, plus a curated picker for the tools GitHub can't see (Postman, Power BI, VS Code…).
- **Two ways to stay fresh** — commit the assets and let the bundled GitHub Action re-render them twice a week, **or** flip the generator to *Live badges* and serve them from a Cloudflare Worker with a server-side token (always current, no Action needed).

## Quickstart (hosted generator)

1. Open the app in `app/` (or deploy it to Vercel — `vercel.json` is ready).
2. Enter your GitHub username. Hit **Load data**.
3. (Optional) paste a read-only PAT to unlock pinned repos + your real contribution graph.
4. Tune the Missions, Socials, and Web Arsenal panels.
5. Hit **Download**, unzip into a new `username/username` repo, commit, push. Done.

> Prefer offline / no browser? Use the CLI:
> ```bash
> python tools/generate.py --username yourname --token ghp_xxx
> ```

## Auto-setup — no app, username detected for you

The same theme can be dropped into **your** profile repo with almost no configuration, because the bundled GitHub Action reads `github.repository_owner` at runtime — in a `username/username` repo that is *always* your username. No hardcoded values, no editing the workflow.

1. **Create the repo**: a new **public** repo named exactly `yourusername/yourusername` (lowercase).
2. **Drop in the theme**: clone the zip's contents into the repo root — `README.md`, `assets/`, `theme/`, `tools/`, `.github/workflows/refresh.yml`.
3. **Enable Actions**: the workflow `refresh.yml` commits and pushes the freshly generated `assets/*.svg` every Monday + Thursday, and uses the repo's auto-provisioned `secrets.GITHUB_TOKEN` (no setup). Run it once from the *Actions* tab to generate your stats immediately.
4. That's it — the README, the badge URLs, and the auto-refresh all key off `github.repository_owner`, so switching accounts or forking "just works".

If your display name differs from your username (e.g. *Robert Downey Jr.* vs `rdj`), edit it once in `README.md` — everything else is derived.

## Live badges — always-fresh stats from a Cloudflare Worker

The committed-asset Action is the zero-hosting default. For stats that update the moment you push, the generator can point the README at **live badge URLs** served by a shared Worker (`workers/`) that reuses the exact same renderers, but with a **server-side** token:

```text
https://spidey-stats.<your-subdomain>.workers.dev/{username}/streak.svg
https://spidey-stats.<your-subdomain>.workers.dev/{username}/hero-stats.svg
https://spidey-stats.<your-subdomain>.workers.dev/{username}/achievements.svg
https://spidey-stats.<your-subdomain>.workers.dev/{username}/arsenal.svg?tools=fastapi,react,...
https://spidey-stats.<your-subdomain>.workers.dev/{username}/swing.svg
```

**Deploy it (5 minutes, free tier):**

```bash
cd workers
npm install
npx wrangler login
npx wrangler deploy                    # writes the .workers.dev URL
npx wrangler secret put GITHUB_TOKEN   # paste a read-only PAT — lives only in Cloudflare
```

**Point the generator at it:** in the *Web Arsenal* panel, switch *Stats delivery* to **Live badges** and paste your `https://spidey-stats.….workers.dev` URL. The generator rewrites the README's data-SVG references to badge URLs (and appends your tool picks to the arsenal badge), while `hero.svg` and the static dividers stay committed — they have no live data.

How it behaves: responses are cached 6h via the Cache API, and the underlying GitHub data is shared across all five badges for an hour — so one visitor costs roughly one API burst, not five. Per-IP + per-username throttling and a global cap protect your token's quota. A missing/invalid token, a rate-limit, or an unknown user each render a distinct honest error badge. A badge renders only when the profile fetch succeeds — it never shows demo numbers as if they were live.

## Project layout

```
spiderman-github-readme/
├── themes/spiderman/        # theme pack: theme.json + templates + static SVGs
├── app/                     # Vercel-ready React generator (Vite + TypeScript)
│   ├── src/lib/
│   │   ├── github.ts        # REST + GraphQL data layer (optional PAT)
│   │   ├── arsenal.ts       # auto-categorization + curated tool picker
│   │   ├── render.ts        # ports tools/generate.py's 5 SVG builders to TS
│   │   ├── icons.ts         # vendored simple-icons lookup + monogram glyphs
│   │   ├── download.ts      # JSZip assembly of the profile .zip
│   │   └── ...
│   └── public/              # payload files shipped inside the .zip
├── workers/                 # Cloudflare Worker (live badge mode)
│   └── src/index.ts         # GET /{username}/{asset}.svg, server-side token
├── tools/                   # offline Python CLI (also ships in the .zip)
└── theme/                   # theme.json reference (copied into themes/)
```

The data SVGs (`hero-stats`, `streak`, `arsenal`, `swing`, `achievements`) share one naming scheme across the app, the CLI, the Action, and the Worker, so the Action refreshes exactly the files the README references.

## Adding your own theme

A theme is a folder under `themes/` with:

- `theme.json` — palette tokens, typography, Spider-Verse terminology, animation notes
- `templates/README.md.tmpl` — the README template with `{{PLACEHOLDERS}}`
- `static/*.svg` — the hand-crafted, non-data SVGs (hero, divider, spider-sense, footer)

The 5 data SVGs are generated at runtime from the theme palette in `render.ts`, so a new palette restyles everything.

## Tech notes

- **No backend in the app.** All API calls happen in the browser against `api.github.com`. Rate limit is ~60 req/hr unauthenticated; a read-only PAT (sent straight to GitHub, never stored server-side) raises it and unlocks GraphQL endpoints. The **badge Worker is the one exception**: it holds a single server-side `GITHUB_TOKEN` in Cloudflare secrets.
- **Icons are vendored** (`src/lib/icons.json`) as a pruned snapshot of [simple-icons](https://github.com/simple-icons/simple-icons) (CC0 1.0). Brands simple-icons removed (AWS, VS Code, Power BI, Matplotlib, Playwright) render as inline monogram glyphs. Run `npm run build:icons` to refresh the dataset.
- **System fonts only** (Impact, Segoe UI, Consolas) so SVGs render identically everywhere — no font downloads in GitHub image rendering.
- **Color tokens** live in `theme.json` — red is the attention color, background stays near-black/navy, one animated element per viewport.

## License

MIT — see [LICENSE](./LICENSE). Theme is inspired by Spider-Man (original graphics only, no copyrighted assets).
