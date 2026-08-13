import { useEffect, useMemo, useState } from 'react'
import type { LanguageShare, StatsMode } from '../lib/types'
import { CATS, detectLanguages } from '../lib/arsenal'
import type { ArsenalCat } from '../lib/arsenal'
import { REGISTRY } from '../lib/registry'
import { loadIcon, preloadIcons, normSlug } from '../lib/iconLoader'
import { C } from '../lib/palette'

interface Props {
  languages: LanguageShare[]
  picks: string[]
  onChange: (picks: string[]) => void
  statsMode: StatsMode
  onStatsMode: (m: StatsMode) => void
  badgeBase: string
  onBadgeBase: (v: string) => void
}

interface Entry {
  slug: string
  label: string
  cat: ArsenalCat
}

function catColor(id: ArsenalCat): string {
  return CATS.find((c) => c.id === id)?.color ?? C.MUTED
}

/** Live icon tile: loads from CDN (cached), updates via state. */
function IconTile({ slug }: { slug: string }) {
  const [svg, setSvg] = useState<string>('')
  const norm = normSlug(slug)

  useEffect(() => {
    let alive = true
    loadIcon(norm).then((s) => alive && setSvg(s))
    return () => {
      alive = false
    }
  }, [norm])

  if (!svg) {
    // Placeholder while loading
    return <span className="tile-skeleton" aria-hidden="true" />
  }
  return <span dangerouslySetInnerHTML={{ __html: svg }} aria-hidden="true" />
}

export function ArsenalEditor({
  languages,
  picks,
  onChange,
  statsMode,
  onStatsMode,
  badgeBase,
  onBadgeBase,
}: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(true)
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  const selected = new Set(picks)

  // Auto-detected languages (pct ≥ 1.5) — highlighted in the picker
  const detected = useMemo(() => detectLanguages(languages), [languages])
  const detectedSlugs = useMemo(
    () => new Set(detected.map((d) => normSlug(d.slug))),
    [detected],
  )

  // Preload all registry icons on mount (fire-and-forget)
  useEffect(() => {
    preloadIcons(REGISTRY.map((e) => e.slug))
  }, [])

  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list: Entry[] = needle
      ? REGISTRY.filter((e) => e.label.toLowerCase().includes(needle))
      : REGISTRY
    const byCat = new Map<ArsenalCat, Entry[]>()
    for (const e of list) {
      const arr = byCat.get(e.cat) ?? []
      arr.push(e)
      byCat.set(e.cat, arr)
    }
    return CATS.map((c) => ({ cat: c, entries: byCat.get(c.id) ?? [] }))
  }, [q])

  const toggle = (slug: string) => {
    const next = selected.has(slug) ? picks.filter((p) => p !== slug) : [...picks, slug]
    onChange(next)
  }

  const toggleCat = (id: string) => {
    setOpenCats((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Keep the stack-holder height natural (no fixed clamp) — grid grows downward.

  return (
    <section className="panel arsenal-panel">
      <div className="panel-head" onClick={() => setOpen((o) => !o)}>
        <h2>
          <span className="caret">{open ? '▾' : '▸'}</span> Web Arsenal
        </h2>
        <span className="head-meta">{picks.length} selected</span>
      </div>

      {open && (
        <div className="arsenal-body">
          <p className="hint small">
            Real language bytes auto-detected from your repos glow in the picker; add the rest of
            your stack from the catalog below.
          </p>

          {detected.length > 0 && (
            <div className="detected-row">
              <span className="detected-label">Auto-detected languages</span>
              <div className="chip-list">
                {detected.map((d) => (
                  <span
                    key={d.slug}
                    className={`chip glow ${selected.has(normSlug(d.slug)) ? 'on' : ''}`}
                    style={{ borderColor: catColor(d.cat) }}
                    onClick={() => !selected.has(normSlug(d.slug)) && toggle(normSlug(d.slug))}
                    role="button"
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="search-row">
            <input
              type="text"
              placeholder="Search the stack… (e.g. postman, power bi, rust)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="catalog-scroll">
            {grouped.map(({ cat, entries }) =>
              entries.length ? (
                <div className="cat-block" key={cat.id}>
                  <button
                    type="button"
                    className="cat-toggle"
                    onClick={() => toggleCat(cat.id)}
                  >
                    <span className="cat-name" style={{ color: cat.color }}>
                      {cat.title}
                    </span>
                    <span className="cat-count">{entries.length}</span>
                    <span className="caret small">{openCats[cat.id] ? '▴' : '▾'}</span>
                  </button>
                  {openCats[cat.id] === false ? null : (
                    <div className="tool-grid">
                      {entries.map((e) => {
                        const slug = normSlug(e.slug)
                        const isSel = selected.has(slug)
                        const isDetected = detectedSlugs.has(slug)
                        return (
                          <button
                            key={slug}
                            type="button"
                            aria-pressed={isSel}
                            className={
                              'tool-cell' +
                              (isSel ? ' on' : '') +
                              (isDetected && !isSel ? ' detected' : '')
                            }
                            style={isDetected ? { borderColor: catColor(e.cat) } : undefined}
                            onClick={() => toggle(slug)}
                            title={isDetected ? `${e.label} (auto-detected)` : e.label}
                          >
                            <IconTile slug={slug} />
                            <span>{e.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null,
            )}
            {grouped.every(({ entries }) => !entries.length) && (
              <div className="empty-inline">No items match “{q}”.</div>
            )}
          </div>

          <label className="stats-label">
            Stats delivery
            <div className="seg">
              <button
                type="button"
                className={statsMode === 'commit' ? 'seg-btn on' : 'seg-btn'}
                onClick={() => onStatsMode('commit')}
              >
                Committed assets
              </button>
              <button
                type="button"
                className={statsMode === 'badge' ? 'seg-btn on' : 'seg-btn'}
                onClick={() => onStatsMode('badge')}
              >
                Live badges
              </button>
            </div>
            <p className="hint small">
              {statsMode === 'commit'
                ? 'SVGs committed to the repo and refreshed by the GitHub Action (works with no hosting).'
                : 'README points at live badge URLs from your Cloudflare Worker — always fresh, no Action needed.'}
            </p>
            {statsMode === 'badge' && (
              <input
                type="text"
                placeholder="https://spidey-stats.your-subdomain.workers.dev"
                value={badgeBase}
                onChange={(e) => onBadgeBase(e.target.value)}
              />
            )}
          </label>
        </div>
      )}
    </section>
  )
}
