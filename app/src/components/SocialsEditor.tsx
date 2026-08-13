import type { Socials } from '../lib/types'

interface Props {
  socials: Socials
  onChange: (s: Socials) => void
}

const FIELDS: Array<{ key: keyof Socials; label: string; placeholder: string }> = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/…' },
  { key: 'devto', label: 'Dev.to', placeholder: 'https://dev.to/…' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
]

export function SocialsEditor({ socials, onChange }: Props) {
  return (
    <section className="panel">
      <h2>Spider-Sense network <span className="optional">socials</span></h2>
      <p className="hint">Only the links you fill in appear as badges, in LinkedIn → Email → Dev.to → X order.</p>
      {FIELDS.map(({ key, label, placeholder }) => (
        <label key={key}>
          {label}
          <input
            value={socials[key]}
            onChange={(e) => onChange({ ...socials, [key]: e.target.value.trim() })}
            placeholder={placeholder}
            spellCheck={false}
          />
        </label>
      ))}
    </section>
  )
}
