import type { Project } from '../lib/types'

interface Props {
  projects: Project[]
  username: string
  onChange: (projects: Project[]) => void
}

const BLANK: Project = { name: '', repo: '', description: '', homepage: '', stargazers: 0, primaryLanguage: '' }

export function MissionsEditor({ projects, username, onChange }: Props) {
  const set = (i: number, patch: Partial<Project>) =>
    onChange(projects.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const add = () => onChange([...projects, { ...BLANK }])
  const remove = (i: number) => onChange(projects.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= projects.length) return
    const next = [...projects]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <section className="panel">
      <h2>Web missions <span className="optional">3 × 2 grid</span></h2>
      <p className="hint">
        The first project becomes the full-width <em>Current Mission</em>; the rest fill the
        <em> Web Missions</em> grid. Repo slug is the GitHub path (e.g. <code>PulseWatch</code>);
        leave homepage blank to hide the LIVE button.
      </p>
      {projects.map((p, i) => (
        <div className="mission" key={i}>
          <div className="mission-head">
            <span className="mission-num">{String(i + 1).padStart(2, '0')}</span>
            <input
              className="name"
              value={p.name}
              onChange={(e) => set(i, { name: e.target.value })}
              placeholder="Mission name"
            />
            <div className="row-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === projects.length - 1} title="Move down">↓</button>
              <button type="button" onClick={() => remove(i)} title="Remove">✕</button>
            </div>
          </div>
          <input
            value={p.repo}
            onChange={(e) => set(i, { repo: e.target.value.replace(/^https?:\/\/github\.com\//, '') })}
            placeholder={`repo slug (github.com/${username || 'you'}/…)`}
          />
          <textarea
            value={p.description}
            onChange={(e) => set(i, { description: e.target.value })}
            rows={2}
            placeholder="One line about the mission…"
          />
          <input
            value={p.homepage}
            onChange={(e) => set(i, { homepage: e.target.value.trim() })}
            placeholder="https://… (live demo URL)"
          />
        </div>
      ))}
      <div className="add-row">
        <button type="button" onClick={add} className="ghost">+ Add mission</button>
        {projects.length > 6 && <span className="warn">Grid shows the first 6 (1 current + 5 grid).</span>}
      </div>
    </section>
  )
}
