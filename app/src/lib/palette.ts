// Palette tokens — resolved from themes/spiderman/theme.json at build time so
// a future theme can restyle all five generated SVGs by swapping theme.json.
// Extra fixed shades (green, skyline fill) stay as Spider-Verse constants here.

import theme from './theme.json'

const p = theme.palette

export const C = {
  BG: p.background ?? '#05070D',
  CARD: p.deep_navy ?? '#081426',
  BORDER: p.muted_blue ?? '#17365C',
  RED: p.spider_red ?? '#E62429',
  BRIGHT: p.bright_red ?? '#FF3340',
  WHITE: p.web_white ?? '#EAF2FF',
  BLUE: p.electric_blue ?? '#1976D2',
  MUTED: p.muted_text ?? '#8B9BB4',
  GREEN: '#2BD576', // not a theme token — Spider-Verse "online/hero" green
  SKYLINE: '#0A1929', // building silhouettes on the swing/hero horizon
} as const

export const FONT_DISPLAY = "Impact,'Arial Black',sans-serif"
export const FONT_BODY = "'Segoe UI',system-ui,sans-serif"
export const FONT_MONO = "'Cascadia Code',Consolas,monospace"
