interface Props {
  error: string | null
}

// No token input here — the generator talks to the Cloudflare Worker
// (spidey-stats.robekmedia-723.workers.dev), which holds the GITHUB_TOKEN
// server-side. The token never reaches the browser.
export function DataPanel({ error }: Props) {
  return (
    <section className="panel">
      <h2>GitHub data <span className="optional">live</span></h2>
      <p className="hint">
        Data is pulled server-side via the badge Worker — your real contribution
        calendar, pinned repos, and exact language bytes. No token required here;
        the Worker holds it. Display name and bio auto-fill from your profile.
      </p>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
