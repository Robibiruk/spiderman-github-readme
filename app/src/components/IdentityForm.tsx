interface Props {
  username: string
  displayName: string
  bio: string
  onPatch: (p: { username?: string; displayName?: string; bio?: string }) => void
  onSubmit: () => void
  loading: boolean
  real: boolean
}

export function IdentityForm({ username, displayName, bio, onPatch, onSubmit, loading, real }: Props) {
  return (
    <section className="panel">
      <h2>Identity</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <label>
          GitHub username
          <input
            value={username}
            onChange={(e) => onPatch({ username: e.target.value.replace(/^@/, '') })}
            placeholder="octocat"
            spellCheck={false}
          />
        </label>
        <label>
          Display name (hero typing + header)
          <input
            value={displayName}
            onChange={(e) => onPatch({ displayName: e.target.value })}
            placeholder="PETER PARKER"
            spellCheck={false}
          />
        </label>
        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => onPatch({ bio: e.target.value })}
            rows={3}
            placeholder="Friendly neighborhood developer…"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : dataStatus(real, username)}
        </button>
      </form>
    </section>
  )
}

function dataStatus(real: boolean, username: string): string {
  return real ? `Live data · ${username} ✓` : `Load GitHub data · ${username || '…'}`
}
