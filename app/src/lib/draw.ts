// Small SVG geometry helpers shared by the renderers. Ported from
// tools/generate.py (spider_emblem, burst_poly, star_pts, hex_blend) so the
// browser generator and the offline CLI produce identical output.

import { C } from './palette'

/** Interpolate two #RRGGBB colors; t in [0,1]. */
export function hexBlend(a: string, b: string, t: number): string {
  const tt = Math.max(0, Math.min(1, t))
  const at = [0, 2, 4].map((i) => parseInt(a.slice(i + 1, i + 3), 16))
  const bt = [0, 2, 4].map((i) => parseInt(b.slice(i + 1, i + 3), 16))
  const ch = (k: number) =>
    Math.round(at[k] + (bt[k] - at[k]) * tt)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${ch(0)}${ch(1)}${ch(2)}`
}

/** Geometric spider emblem (body + head + 8 cubic legs) centered at (cx,cy). */
export function spiderEmblem(cx: number, cy: number, scale = 1.0, color = C.RED): string {
  const legs: Array<[number, number, number, number, number, number, number, number]> = [
    [-6, -6, -16, -14, -25, -9, -32, -16],
    [-7.5, -1, -19, -3, -27, 1, -34, 6],
    [-6.5, 5, -16, 8, -24, 14, -30, 21],
    [-4, 9, -11, 14, -17, 22, -21, 28],
    [6, -6, 16, -14, 25, -9, 32, -16],
    [7.5, -1, 19, -3, 27, 1, 34, 6],
    [6.5, 5, 16, 8, 24, 14, 30, 21],
    [4, 9, 11, 14, 17, 22, 21, 28],
  ]
  return `
<g transform="translate(${cx},${cy}) scale(${scale})">
  <g fill="${color}">
    <ellipse cx="0" cy="0" rx="8.5" ry="13"/>
    <circle cx="0" cy="-15" r="5.5"/>
  </g>
  <g stroke="${color}" stroke-width="2.2" stroke-linecap="round" fill="none">
    ${legs
      .map(
        ([sx, sy, cx1, cy1, cx2, cy2, ex, ey]) =>
          `<path d="M${sx},${sy} C${cx1},${cy1} ${cx2},${cy2} ${ex},${ey}"/>`,
      )
      .join('\n    ')}
  </g>
</g>`
}

/** N-point star / burst polygon centered at (cx,cy). */
export function burstPoly(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  points = 12,
  rot = 0,
): string {
  const pts: string[] = []
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 === 0 ? rOut : rIn
    const a = rot + (Math.PI * k) / points - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

/** Classic 5-point star polygon at (cx,cy) with outer radius r. */
export function starPts(cx: number, cy: number, r: number): string {
  return burstPoly(cx, cy, r, r * 0.42, 5)
}
