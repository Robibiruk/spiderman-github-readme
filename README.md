# 🕷️ Spider-Sense Profile Generator

<p align="center">
  <img src="assets/hero.svg" alt="Spider-Sense Profile Generator" width="100%">
</p>

<p align="center">
  <b>Turn your GitHub profile into an animated Spider-Verse comic book.</b>
  <br>
  Built for developers who think a normal README is boring.
</p>

<p align="center">
  <a href="https://github.com/Robibiruk/spiderman-github-readme">
    <img src="https://img.shields.io/github/stars/Robibiruk/spiderman-github-readme?style=for-the-badge&logo=github&label=STARS" alt="GitHub Stars">
  </a>
  <img src="https://img.shields.io/badge/Spider--Verse-E62429?style=for-the-badge" alt="Spider-Verse">
  <img src="https://img.shields.io/badge/Animated-SVG-1976D2?style=for-the-badge" alt="Animated SVG">
  <img src="https://img.shields.io/badge/No-Backend-2BD576?style=for-the-badge" alt="No Backend">
  <img src="https://img.shields.io/badge/Open%20Source-000?style=for-the-badge&logo=github" alt="Open Source">
</p>

---

## 🕸️ What is this?

**Spider-Sense Profile Generator** is a client-side generator for building highly animated GitHub profile READMEs inspired by the Spider-Verse.

Enter your GitHub username, customize your profile, choose your projects and tech stack, preview everything, then download a ready-to-use profile.

No database.
No account.
No complicated setup.

Just **generate → download → push to GitHub**.

---

## 🕷️ The result

Your boring GitHub profile:

```text
Hello, I'm Robel.
I'm a developer.
Here are my projects...
```

becomes something more like:

<p align="center">
  <img src="assets/hero-stats.svg" alt="Animated GitHub statistics" width="100%">
</p>

<p align="center">
  <img src="assets/streak-stats.svg" alt="GitHub contribution streak" width="100%">
</p>

<p align="center">
  <img src="assets/achievements.svg" alt="GitHub achievements" width="100%">
</p>

<p align="center">
  <img src="assets/web-arsenal.svg" alt="Developer technology arsenal" width="100%">
</p>

<p align="center">
  <img src="assets/web-swing.svg" alt="Contribution activity" width="100%">
</p>

---

## ⚡ Features

### 🎬 Animated Spider-Verse UI

The generated profile uses animated SVG artwork instead of static cards.

Everything is designed to work inside GitHub README images using **SMIL/CSS animations**, without JavaScript embedded in the SVGs.

### 📊 Real GitHub data

Pull profile information directly from GitHub, including:

* repositories
* languages
* contribution activity
* commits
* pull requests
* issues
* stars
* followers
* contribution streaks
* project information

The generator can work without authentication using public GitHub data, while an optional token unlocks additional contribution information.

### 🕸️ Web Arsenal

Your technology stack isn't just dumped into a random list.

Languages detected from your repositories are analyzed and organized into categories such as:

* Programming Languages
* Frontend
* Backend
* AI / ML / Data
* Databases
* Tools & DevOps

You can also manually add technologies that GitHub can't reliably infer.

### 🏆 Spider-Verse achievements

Your GitHub activity is turned into comic-style achievement cards and a hero ranking system.

Because apparently writing code for 14 hours straight should earn XP.

### 🏙️ Contribution Web Swing

Your contribution activity becomes a Spider-Man-inspired visual instead of another generic contribution graph.

### ☁️ Live statistics

Choose between two approaches:

**Committed SVGs**

GitHub Actions periodically regenerates your assets and commits the updated SVGs.

**Live badges**

Use the included Cloudflare Worker to serve fresh statistics dynamically.

The worker currently provides endpoints for generated stats such as:

```text
/{username}/streak.svg
/{username}/hero-stats.svg
/{username}/achievements.svg
/{username}/arsenal.svg
/{username}/swing.svg
```

---

# 🚀 Quick Start

## 1. Clone the repository

```bash
git clone https://github.com/Robibiruk/spiderman-github-readme.git
cd spiderman-github-readme
```

## 2. Start the generator

```bash
cd app
npm install
npm run dev
```

Open the local Vite URL shown in your terminal.

---

## 3. Generate your profile

Inside the generator:

1. Enter your GitHub username.
2. Load your GitHub data.
3. Customize your display name and role.
4. Add or remove projects.
5. Add your social links.
6. Customize your Web Arsenal.
7. Choose how statistics should be delivered.
8. Preview the generated README.
9. Download the profile package.

The application generates the README and accompanying SVG assets for you.

---

# 🧬 How it works

```text
                 ┌─────────────────────┐
                 │   GitHub Username   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    GitHub Data      │
                 │                     │
                 │ repos · languages   │
                 │ stats · activity    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Spider-Sense App   │
                 │                     │
                 │ React + TypeScript  │
                 │ client-side         │
                 └──────────┬──────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐        ┌─────────────────┐
     │   SVG Renderer  │        │   README Maker  │
     └────────┬────────┘        └────────┬────────┘
              │                          │
              └────────────┬─────────────┘
                           ▼
                 ┌─────────────────────┐
                 │   Download Profile  │
                 │                     │
                 │ README.md           │
                 │ hero.svg            │
                 │ streak.svg          │
                 │ arsenal.svg         │
                 │ achievements.svg    │
                 │ swing.svg            │
                 └─────────────────────┘
```

---

# 🧰 Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=fff" alt="Vite">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=fff" alt="Python">
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=fff" alt="Cloudflare">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=fff" alt="GitHub Actions">
</p>

### Frontend

* React
* TypeScript
* Vite
* JSZip

### SVG generation

* TypeScript renderers
* Python generator
* SMIL / CSS animations
* `simple-icons`

### Data

* GitHub REST API
* GitHub GraphQL API

### Live statistics

* Cloudflare Workers
* Wrangler

The frontend is deliberately client-side. The application itself does not require a traditional backend.

---

# 🐍 CLI Generator

Prefer the terminal?

The repository also includes a Python-based generator.

```bash
python tools/generate.py --username yourname
```

With a GitHub token:

```bash
GITHUB_TOKEN=ghp_xxx python tools/generate.py
```

The CLI can generate the data-driven SVG assets directly and falls back to deterministic demo data when live data isn't available.

---

# ☁️ Cloudflare Worker

For continuously fresh statistics, deploy the included worker.

```bash
cd workers

npm install

npx wrangler login

npx wrangler deploy
```

Then store your GitHub token as a Cloudflare secret:

```bash
npx wrangler secret put GITHUB_TOKEN
```

The worker is separate from the frontend and is used only when you want live statistics instead of periodically committed SVG files. Its package is configured around Wrangler and Cloudflare Worker types.

---

# 🔄 Keeping statistics fresh

You have two choices.

### Option 1 · GitHub Actions

Generate the SVGs and commit them to your profile repository periodically.

```text
GitHub
   │
   ▼
GitHub Action
   │
   ▼
Generate SVGs
   │
   ▼
Commit changes
   │
   ▼
Updated profile
```

### Option 2 · Cloudflare Worker

Keep the SVGs dynamic.

```text
GitHub Profile
      │
      ▼
Cloudflare Worker
      │
      ▼
GitHub API
      │
      ▼
Fresh SVG
```

Use the first option if you want a completely self-contained profile.

Use the second if you want the numbers to stay current without committing generated files.

---

# 📁 Project Structure

```text
spiderman-github-readme/
│
├── app/
│   ├── src/
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── public/
│   ├── scripts/
│   └── package.json
│
├── assets/
│   ├── hero.svg
│   ├── hero-stats.svg
│   ├── streak-stats.svg
│   ├── achievements.svg
│   ├── web-arsenal.svg
│   └── web-swing.svg
│
├── templates/
│   ├── README.md.tmpl
│   └── hero.svg.tmpl
│
├── tools/
│   ├── generate.py
│   └── tech_icons.py
│
├── workers/
│   └── package.json
│
└── README.md
```

---

# 🔐 Privacy & Security

The generator is designed to run client-side.

Your GitHub token is optional and is only needed for data that GitHub's public endpoints cannot provide.

If you deploy the Cloudflare Worker, the GitHub token is stored as a Worker secret rather than being exposed in the generated profile.

**Never commit your GitHub token to this repository or your profile README.**

---

# 🎨 Design Philosophy

This project isn't trying to make another generic GitHub stats card.

The goal is to make the entire profile feel like a **character sheet from a Spider-Verse comic**.

That means:

```text
Stats        → Hero abilities
Repositories → Missions
Technologies → Web Arsenal
Contributions → Web Swing
Achievements → Hero Rank
Profile      → Spider-Sense
```

The visuals are generated from your actual developer activity, so the profile isn't just a Spider-Man skin pasted over a standard stats template.

---

# 🛣️ Roadmap

* [x] Animated hero
* [x] GitHub profile data
* [x] Repository detection
* [x] Language analysis
* [x] Animated contribution visualization
* [x] Achievement system
* [x] Technology arsenal
* [x] README generation
* [x] ZIP download
* [x] CLI generator
* [x] GitHub Actions support
* [x] Cloudflare live-stat worker
* [ ] More Spider-Verse visual themes
* [ ] Custom color palettes
* [ ] More achievement types
* [ ] Additional social integrations
* [ ] One-click GitHub profile deployment

---

# 🤝 Contributing

Found a bug? Have a better animation? Want to add another Spider-Verse-inspired panel?

Pull requests are welcome.

```bash
git checkout -b feature/my-spider-power

git add .

git commit -m "feat: add my spider power"

git push origin feature/my-spider-power
```

Then open a pull request.

Keep the visuals sharp, the code clean, and the README worthy of a superhero.

---

# ⚖️ Credits

Built with:

* [React](https://react.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vite.dev/)
* [GitHub API](https://docs.github.com/en/rest)
* [Cloudflare Workers](https://workers.cloudflare.com/)
* [simple-icons](https://simpleicons.org/)

Technology icons are sourced from `simple-icons`, which provides the icon set under CC0 1.0.

---

<h2 align="center">🕷️ With great GitHub profiles comes great responsibility.</h2>

<p align="center">
  <sub>Made for developers who refuse to have a boring README.</sub>
</p>

