interface Props {
  heroSvg: string | null
  svgs: Record<string, string> | null
  readme: string | null
  busyZip: boolean
  onDownload: () => void
  onCopyReadme: () => void
  copied: boolean
}

const ORDER: Array<[string, string]> = [
  ['hero', 'Hero'],
  ['spider-sense', 'Spider-Sense'],
  ['streak', 'Web streak'],
  ['hero-stats', 'Hero stats'],
  ['achievements', 'Achievements'],
  ['arsenal', 'Web arsenal'],
  ['swing', 'Web swing'],
]

export function Preview({ heroSvg, svgs, readme, busyZip, onDownload, onCopyReadme, copied }: Props) {
  return (
    <section className="panel preview">
      <div className="preview-head">
        <h2>Preview</h2>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={onCopyReadme} disabled={!readme || busyZip}>
            {copied ? 'Copied ✓' : 'Copy README.md'}
          </button>
          <button type="button" onClick={onDownload} disabled={busyZip}>
            {busyZip ? 'Zipping…' : '⬇ Download theme zip'}
          </button>
        </div>
      </div>
      <p className="hint">
        The zip drops the whole theme into any <code>username/username</code> repo: README.md,
        <code> assets/*.svg</code>, a GitHub Action for auto-refresh, and the offline CLI.
      </p>
      <div className="profile-frame">
        {heroSvg && <InlineSvg svg={heroSvg} label="hero.svg" />}
        {svgs
          ? ORDER.filter(([k]) => svgs[k]).map(([k]) => (
              <div className="svg-block" key={k}>
                <InlineSvg svg={svgs[k]} label={`assets/${k}.svg`} />
              </div>
            ))
          : <div className="empty">Enter a username and load data to see the preview.</div>}
      </div>
      {readme && (
        <details className="readme-src">
          <summary>README.md source</summary>
          <pre>{readme}</pre>
        </details>
      )}
    </section>
  )
}

function InlineSvg({ svg, label }: { svg: string; label: string }) {
  return (
    <div className="svg-block">
      <div className="svg-label">{label}</div>
      <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
