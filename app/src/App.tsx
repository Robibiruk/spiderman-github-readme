import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GitHubData, GenOptions } from './lib/types'

const WORKER_BASE = 'https://spidey-stats.robekmedia-723.workers.dev'
import {
  renderSwingSvg,
  renderArsenalSvg,
  renderAchievementsSvg,
  renderHeroStatsSvg,
  renderStreakSvg,
  renderHeroSvg,
  renderSpiderSenseSvg,
  renderReadme,
  weeklySums,
} from './lib/render'
import { buildArsenal } from './lib/arsenal'
import { buildZip, triggerDownload } from './lib/download'
import { IdentityForm } from './components/IdentityForm'
import { DataPanel } from './components/DataPanel'
import { MissionsEditor } from './components/MissionsEditor'
import { SocialsEditor } from './components/SocialsEditor'
import { ArsenalEditor } from './components/ArsenalEditor'
import { Preview } from './components/Preview'

function topLang(langs: { name: string; pct: number }[]): [string, number] {
  return langs.length ? [langs[0].name, langs[0].pct] : ['OTHER', 0]
}

const INITIAL: GenOptions = {
  username: 'Robibiruk',
  displayName: '',
  bio: '',
  projects: [],
  socials: { linkedin: '', twitter: '', devto: '', email: '' },
  tools: ['fastapi', 'react', 'nodedotjs', 'postgresql', 'docker', 'vercel', 'git'],
  statsMode: 'commit',
  badgeBase: WORKER_BASE,
}

export default function App() {
  const [options, setOptions] = useState<GenOptions>(INITIAL)
  const [data, setData] = useState<GitHubData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ readme: string; hero: string } | null>(null)
  const [busyZip, setBusyZip] = useState(false)
  const [copied, setCopied] = useState(false)

  const patch = useCallback(
    (p: Partial<GenOptions>) => setOptions((o) => ({ ...o, ...p })),
    [],
  )

  const load = useCallback(async () => {
    if (!options.username) {
      // Clear all form state when username is empty
      setData(null)
      setError(null)
      patch({
        displayName: '',
        bio: '',
        projects: [],
        socials: { linkedin: '', twitter: '', devto: '', email: '' },
        tools: INITIAL.tools,
      })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${WORKER_BASE}/api/data/${options.username}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const d = await res.json()
      setData(d)
      // Replace (not merge) fetched data on new username load
      patch({
        projects: d.projects,
        displayName: d.profileName ? d.profileName.toUpperCase() : '',
        bio: d.profileBio ?? '',
        // Keep socials and tools as-is unless user explicitly wants to reset
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub data')
      // On error, still clear data
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [options.username, patch])

  // Fetch the two templates that the preview needs (buildZip re-fetches them).
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('templates/README.md.tmpl').then((r) => r.text()),
      fetch('templates/hero.svg.tmpl').then((r) => r.text()),
    ]).then(([readme, hero]) => {
      if (!cancelled) setTemplates({ readme, hero })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const heroSvg = useMemo(
    () => (templates ? renderHeroSvg(templates.hero, options.displayName) : null),
    [templates, options.displayName],
  )

  const svgs = useMemo(() => {
    if (!data) return null
    const hero = data.hero
    const real = data.real
    return {
      streak: renderStreakSvg(hero, real),
      'hero-stats': renderHeroStatsSvg(hero, real, topLang(data.languages)),
      achievements: renderAchievementsSvg(hero, real),
      arsenal: renderArsenalSvg(real, buildArsenal(data.languages, options.tools)),
      swing: renderSwingSvg(weeklySums(data.weeks ?? []), real),
      'spider-sense': renderSpiderSenseSvg(hero, real, data.projects, options.username),
    }
  }, [data, options.tools])

  const readme = useMemo(
    () => (templates ? renderReadme(templates.readme, options) : null),
    [templates, options],
  )

  const handleDownload = async () => {
    if (!data) return
    setBusyZip(true)
    try {
      const blob = await buildZip(options, data)
      triggerDownload(blob, `${options.username}.zip`)
    } finally {
      setBusyZip(false)
    }
  }

  const handleCopy = async () => {
    if (!readme) return
    await navigator.clipboard.writeText(readme)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app">
      <header className="masthead">
        <div className="emblem" aria-hidden="true" />
        <h1>SPIDER-SENSE PROFILE GENERATOR</h1>
        <p className="sub">
          Animated Spider-Verse GitHub profile README — generated entirely in your browser, no
          backend, no account. Open source.
        </p>
      </header>
      <main className="grid">
        <div className="col-left">
          <IdentityForm
            username={options.username}
            displayName={options.displayName}
            bio={options.bio}
            onPatch={(p) => patch(p)}
            onSubmit={() => void load()}
            loading={loading}
            real={!!data?.real}
          />
          <DataPanel error={error} />
          <MissionsEditor
            projects={options.projects}
            username={options.username}
            onChange={(projects) => patch({ projects })}
          />
          <SocialsEditor socials={options.socials} onChange={(socials) => patch({ socials })} />
          <ArsenalEditor
            languages={data?.languages ?? []}
            picks={options.tools}
            onChange={(tools) => patch({ tools })}
            statsMode={options.statsMode}
            onStatsMode={(statsMode) => patch({ statsMode })}
            badgeBase={options.badgeBase}
            onBadgeBase={(badgeBase) => patch({ badgeBase })}
          />
        </div>
        <div className="col-right">
          <Preview
            heroSvg={heroSvg}
            svgs={svgs}
            readme={readme}
            busyZip={busyZip}
            onDownload={() => void handleDownload()}
            onCopyReadme={() => void handleCopy()}
            copied={copied}
          />
        </div>
      </main>
      <footer className="foot">
        <span>SPIDER-SENSE GENERATOR</span>
        <span className="dim">system fonts · SMIL animations · simple-icons (CC0)</span>
      </footer>
    </div>
  )
}
