// Shared shapes between the data layer (github.ts), renderers (render.ts),
// and the UI (App.tsx). Mirrors the Hero/Project/Week vocabulary from
// tools/generate.py so the offline CLI and the browser generator agree.

export interface Hero {
  commits: number
  stars: number
  prs: number
  issues: number
  repos: number
  followers: number
  contributed: number // distinct repos contributed to
  account_years: number
  total_contribs: number
  current_streak: number
  longest_streak: number
  current_range: string
  longest_range: string
  window: string // e.g. "SINCE JUL23, 2025"
  created: string
  languages: number // distinct languages with >1.5% share
}

export interface LanguageShare {
  name: string
  pct: number
  bytes: number
}

/** One week of contribution data — index into days, 0 = Sunday. */
export interface Week {
  days: number[]
}

export interface Project {
  name: string // display name, e.g. "PulseWatch"
  repo: string // repo slug, e.g. "PulseWatch"
  description: string
  homepage: string // live site URL, may be ''
  stargazers: number
  primaryLanguage: string // display name, may be ''
}

export interface GitHubData {
  hero: Hero
  weeks: Week[] | null // null when no token (falls back to demo)
  languages: LanguageShare[]
  projects: Project[] // pinned / hand-picked missions
  real: boolean // true when a live contribution calendar was fetched
  found: boolean // true when the GitHub user profile itself was fetched
  /** Why the profile lookup failed; undefined when found (or when a later step failed). */
  userError?: 'not_found' | 'unauthorized' | 'rate_limited' | 'offline'
  /** Raw GitHub error message behind userError, for honest error badges. */
  userErrorDetail?: string
  username: string
  /** Profile display name (from GitHub profile) */
  profileName?: string
  /** Profile bio (from GitHub profile) */
  profileBio?: string
}

export interface Socials {
  linkedin: string
  twitter: string
  devto: string
  email: string
}

export type StatsMode = 'commit' | 'badge'

export interface GenOptions {
  username: string
  displayName: string
  bio: string
  projects: Project[]
  socials: Socials
  /** Curated Web Arsenal picks (TOOL_CATALOG slugs), in display order. */
  tools: string[]
  /** 'commit' = committed assets refreshed by the GitHub Action; 'badge' = live badge URLs. */
  statsMode: StatsMode
  /** Base URL of the badge service (Cloudflare Worker), e.g. https://spidey-stats.workers.dev. */
  badgeBase: string
}
