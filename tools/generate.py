#!/usr/bin/env python3
"""
DevWrapped: Spider-Man theme generator.

Renders the data-driven SVG assets for the profile README:
  * assets/swing.svg              — contribution rhythm as a web swing over the city
  * assets/arsenal.svg            — categorized tech toolbox with real brand icons
  * assets/achievements.svg       — rank-card achievements + hero XP bar
  * assets/hero-stats.svg         — headline stats + letter-grade rating calculator
  * assets/streak.svg             — streak pulse: current/longest streak + totals

Tech icons in arsenal.svg come from simple-icons (CC0 1.0), embedded as
path data in tools/tech_icons.py so the SVG needs no external requests.

Data sources:
  * GitHub REST API for repos + languages (works without a token, rate-limited)
  * GitHub GraphQL API for the contribution calendar (needs a token)

When no token is available (or the network is unreachable) it falls back to
deterministic demo data seeded from the username, so the assets always render.

Usage:
  python tools/generate.py                       # demo data for Robibiruk
  python tools/generate.py --username Robibiruk
  GITHUB_TOKEN=ghp_xxx python tools/generate.py  # real contribution calendar
"""
import argparse
import datetime
import json
import math
import random
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from tech_icons import TECH_ICONS

API = "https://api.github.com"
GRAPHQL = "https://api.github.com/graphql"
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# Spider palette
BG = "#05070D"
CARD = "#081426"
BORDER = "#17365C"
RED = "#E62429"
BRIGHT = "#FF3340"
WHITE = "#EAF2FF"
BLUE = "#1976D2"
MUTED = "#8B9BB4"

FONT_DISP = "Impact,'Arial Black',sans-serif"
FONT_BODY = "'Segoe UI',sans-serif"
FONT_MONO = "'Cascadia Code',Consolas,monospace"

# Authoritative stated stats (Robel's GitHub profile, 2026-08-11).
# Used when live data is unavailable; CI refreshes with live values.
DEFAULT_HERO = {
    "commits": 323, "stars": 16, "prs": 3, "issues": 0, "repos": 35,
    "followers": 16, "contributed": 0, "account_years": 1,
    "total_contribs": 448, "current_streak": 10, "longest_streak": 10,
    "current_range": "AUG 1 – AUG 10", "longest_range": "AUG 24 – SEP 2, 2025",
    "window": "SINCE JUL 23, 2025", "created": "JUL 23, 2025",
}


def http_get(url, token=None):
    req = urllib.request.Request(url, headers={
        "User-Agent": "devwrapped-spiderman",
        "Accept": "application/vnd.github+json",
    })
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_repos(username, token=None):
    """Return list of repos (public)."""
    out, page = [], 1
    while True:
        data = http_get(f"{API}/users/{username}/repos?per_page=100&sort=updated&page={page}", token)
        out += data
        if len(data) < 100:
            break
        page += 1
    return out


def fetch_languages(username, repos, token=None, limit=25):
    """Sum bytes per language across the most recent `limit` repos."""
    totals = {}
    for repo in sorted(repos, key=lambda r: r.get("pushed_at") or "")[:limit]:
        try:
            langs = http_get(repo["languages_url"], token)
        except Exception:
            continue
        for lang, bytes_ in langs.items():
            totals[lang] = totals.get(lang, 0) + bytes_
    return totals


def fetch_contribution_calendar(username, token):
    """Return (weekly_sums, daily_counts) for the last ~52 weeks via GraphQL."""
    query = """
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks { contributionDays { contributionCount } }
          }
        }
      }
    }"""
    body = json.dumps({"query": query, "variables": {"login": username}}).encode()
    req = urllib.request.Request(GRAPHQL, data=body, headers={
        "User-Agent": "devwrapped-spiderman",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))
    weeks = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]
    days = [d["contributionCount"] for w in weeks for d in w["contributionDays"]]
    return [sum(d["contributionCount"] for d in w["contributionDays"]) for w in weeks], days


def fetch_merged_prs(username, token):
    """Total merged pull requests authored by the user (search API)."""
    q = urllib.parse.quote(f"author:{username} type:pr is:merged")
    data = http_get(f"{API}/search/issues?q={q}&per_page=1", token)
    return data.get("total_count", 0)


def current_streak(days):
    """Consecutive days with contributions ending today (today may be 0)."""
    idx = len(days) - 1
    if idx >= 0 and days[idx] == 0:
        idx -= 1
    streak = 0
    while idx >= 0 and days[idx] > 0:
        streak += 1
        idx -= 1
    return streak


def demo_weeks(username):
    rng = random.Random(sum(ord(c) for c in username))
    return [max(0, int(rng.gauss(8, 6))) for _ in range(52)]


def demo_languages(username):
    rng = random.Random(sum(ord(c) for c in username) + 7)
    names = ["TypeScript", "Python", "JavaScript", "HTML", "CSS", "SQL"]
    weights = [rng.randint(10, 30) for _ in names]
    total = sum(weights)
    return [(n, w / total * 100) for n, w in zip(names, weights)]


# ---------------------------------------------------------------- rendering

def hex_blend(a, b, t):
    t = max(0.0, min(1.0, t))
    a = tuple(int(a[i:i+2], 16) for i in (1, 3, 5))
    b = tuple(int(b[i:i+2], 16) for i in (1, 3, 5))
    return "#" + "".join(f"{round(a[i] + (b[i] - a[i]) * t):02X}" for i in range(3))


def spider_emblem(cx, cy, scale=1.0, color=RED):
    """Compact Spider-Man emblem centered at (cx, cy) — body + 8 legs."""
    s = scale
    out = (f'<g fill="{color}">'
           f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{8.5 * s:.2f}" ry="{13 * s:.2f}"/>'
           f'<circle cx="{cx:.1f}" cy="{cy - 15 * s:.2f}" r="{5.5 * s:.2f}"/>'
           f'</g>'
           f'<g stroke="{color}" stroke-width="{2.2 * s:.2f}" stroke-linecap="round" fill="none">')
    legs = [
        (-6, -6, -16, -14, -25, -9, -32, -16), (-7.5, -1, -19, -3, -27, 1, -34, 6),
        (-6.5, 5, -16, 8, -24, 14, -30, 21), (-4, 9, -11, 14, -17, 22, -21, 28),
        (6, -6, 16, -14, 25, -9, 32, -16), (7.5, -1, 19, -3, 27, 1, 34, 6),
        (6.5, 5, 16, 8, 24, 14, 30, 21), (4, 9, 11, 14, 17, 22, 21, 28),
    ]
    for x0, y0, x1, y1, x2, y2, x3, y3 in legs:
        out += (f'<path d="M{cx + x0 * s:.2f},{cy + y0 * s:.2f} '
                f'C{cx + x1 * s:.2f},{cy + y1 * s:.2f} {cx + x2 * s:.2f},{cy + y2 * s:.2f} '
                f'{cx + x3 * s:.2f},{cy + y3 * s:.2f}"/>')
    return out + '</g>'


def burst_poly(cx, cy, r_out, r_in, points=12, rot=0.0):
    """Comic-book starburst polygon points around (cx, cy)."""
    pts = []
    for k in range(points * 2):
        ang = rot + math.pi / points * k
        r = r_out if k % 2 == 0 else r_in
        pts.append(f"{cx + r * math.cos(ang):.1f},{cy + r * math.sin(ang):.1f}")
    return " ".join(pts)


def star_pts(cx, cy, r):
    """Five-point star polygon points around (cx, cy)."""
    pts = []
    for k in range(10):
        ang = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr * math.cos(ang):.1f},{cy + rr * math.sin(ang):.1f}")
    return " ".join(pts)


def hero_grade(hero):
    """Weighted GitHub activity score → (score, letter, color, band label)."""
    c = min(hero["commits"], 400) / 400 * 30
    s = min(hero["stars"], 80) / 80 * 25
    p = min(hero["prs"], 40) / 40 * 20
    i = min(hero["issues"], 30) / 30 * 10
    r = min(hero["repos"], 40) / 40 * 15
    score = int(round(c + s + p + i + r))
    bands = [
        (80, "A++", "#2BD576", "SPIDER-VERSE LEGEND"),
        (72, "A+",  "#2BD576", "LEGENDARY HERO"),
        (64, "A",   "#2BD576", "AVENGER"),
        (56, "B+",  BLUE,      "MAJOR LEAGUE"),
        (48, "B",   BLUE,      "CITY PROTECTOR"),
        (40, "C+",  RED,       "NEIGHBORHOOD HERO"),
        (32, "C",   RED,       "PROMISING VIGILANTE"),
        (24, "D",   MUTED,     "IN TRAINING"),
    ]
    for floor, letter, color, band in bands:
        if score >= floor:
            return score, letter, color, band
    return score, "E", MUTED, "ORIGIN STORY"


def grade_parts(hero):
    """Per-metric weighted sub-scores for the rating calculator."""
    return [
        ("COMMITS",   min(hero["commits"], 400) / 400 * 30, 30),
        ("STARS",     min(hero["stars"], 80) / 80 * 25, 25),
        ("PULL REQS", min(hero["prs"], 40) / 40 * 20, 20),
        ("ISSUES",    min(hero["issues"], 30) / 30 * 10, 10),
        ("REPOS",     min(hero["repos"], 40) / 40 * 15, 15),
    ]


def streak_analysis(days, today):
    """Analyze daily contribution counts ending at `today` (datetime.date).
    Returns (total, current_len, current_range, longest_len, longest_range)."""
    total = sum(days)
    n = len(days)
    dates = [today - datetime.timedelta(days=n - 1 - i) for i in range(n)]

    def fmt(d):
        return d.strftime("%b %d").upper().replace(" 0", " ")

    cur, idx = 0, n - 1
    if idx >= 0 and days[idx] == 0:
        idx -= 1
    end = idx
    while idx >= 0 and days[idx] > 0:
        cur += 1
        idx -= 1
    cur_range = f"{fmt(dates[end - cur + 1])} – {fmt(dates[end])}" if cur else ""

    longest, run, rs, lstart, lend = 0, 0, 0, 0, 0
    for i, d in enumerate(days):
        if d > 0:
            if run == 0:
                rs = i
            run += 1
            if run > longest:
                longest, lstart, lend = run, rs, i
        else:
            run = 0
    lon_range = f"{fmt(dates[lstart])} – {fmt(dates[lend])}" if longest else ""
    return total, cur, cur_range, longest, lon_range


def icon_glyph(key, x, y, accent, s=1.0):
    """Compact geometric icon glyphs (no external assets, GitHub-safe)."""
    key = key.lower().replace(".", "")
    sw = 1.8 * s
    if key == "typescript":
        return f'<text x="{x:.1f}" y="{y + 6 * s:.1f}" text-anchor="middle" font-family="{FONT_MONO}" font-size="{13 * s:.1f}" font-weight="bold" fill="{accent}">TS</text>'
    if key == "javascript":
        return f'<text x="{x:.1f}" y="{y + 6 * s:.1f}" text-anchor="middle" font-family="{FONT_MONO}" font-size="{13 * s:.1f}" font-weight="bold" fill="{accent}">JS</text>'
    if key == "html":
        return f'<text x="{x:.1f}" y="{y + 5 * s:.1f}" text-anchor="middle" font-family="{FONT_MONO}" font-size="{12 * s:.1f}" font-weight="bold" fill="{accent}">&lt;/&gt;</text>'
    if key == "css":
        return f'<text x="{x:.1f}" y="{y + 6 * s:.1f}" text-anchor="middle" font-family="{FONT_MONO}" font-size="{14 * s:.1f}" font-weight="bold" fill="{accent}">#</text>'
    if key == "python":
        return (f'<path d="M{x - 7 * s:.1f},{y + 3 * s:.1f} C{x - 9 * s:.1f},{y - 4 * s:.1f} {x - 3 * s:.1f},{y - 7 * s:.1f} {x + 1 * s:.1f},{y - 4 * s:.1f} '
                f'C{x + 5 * s:.1f},{y - 1 * s:.1f} {x + 7 * s:.1f},{y - 1 * s:.1f} {x + 7 * s:.1f},{y - 4 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{sw:.1f}" stroke-linecap="round"/>'
                f'<path d="M{x + 7 * s:.1f},{y - 3 * s:.1f} C{x + 9 * s:.1f},{y + 4 * s:.1f} {x + 3 * s:.1f},{y + 7 * s:.1f} {x - 1 * s:.1f},{y + 4 * s:.1f} '
                f'C{x - 5 * s:.1f},{y + 1 * s:.1f} {x - 7 * s:.1f},{y + 1 * s:.1f} {x - 7 * s:.1f},{y + 4 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    if key == "jupyter":
        return (f'<circle cx="{x:.1f}" cy="{y - 7 * s:.1f}" r="{3 * s:.1f}" fill="{accent}"/>'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3 * s:.1f}" fill="{accent}"/>'
                f'<circle cx="{x:.1f}" cy="{y + 7 * s:.1f}" r="{3 * s:.1f}" fill="{accent}"/>')
    if key == "fastapi":
        return f'<path d="M{x + 2 * s:.1f},{y - 9 * s:.1f} L{x - 6 * s:.1f},{y + 1 * s:.1f} L{x - 1 * s:.1f},{y + 1 * s:.1f} L{x - 2 * s:.1f},{y + 9 * s:.1f} L{x + 6 * s:.1f},{y - 1 * s:.1f} L{x + 1 * s:.1f},{y - 1 * s:.1f} Z" fill="{accent}"/>'
    if key in ("nodejs", "node"):
        return (f'<path d="M{x:.1f},{y - 9 * s:.1f} L{x + 8 * s:.1f},{y - 4.5 * s:.1f} L{x + 8 * s:.1f},{y + 4.5 * s:.1f} L{x:.1f},{y + 9 * s:.1f} L{x - 8 * s:.1f},{y + 4.5 * s:.1f} L{x - 8 * s:.1f},{y - 4.5 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{sw:.1f}" stroke-linejoin="round"/>'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{2.4 * s:.1f}" fill="{accent}"/>')
    if key == "react":
        return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{9 * s:.1f}" ry="{3.4 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.3 * s:.1f}" transform="rotate(60 {x:.1f} {y:.1f})"/>'
                f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{9 * s:.1f}" ry="{3.4 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.3 * s:.1f}" transform="rotate(-60 {x:.1f} {y:.1f})"/>'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{2 * s:.1f}" fill="{accent}"/>')
    if key == "vite":
        return (f'<path d="M{x:.1f},{y - 9 * s:.1f} L{x + 9 * s:.1f},{y + 8 * s:.1f} L{x - 9 * s:.1f},{y + 8 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{sw:.1f}" stroke-linejoin="round"/>'
                f'<path d="M{x:.1f},{y - 5 * s:.1f} L{x + 4 * s:.1f},{y + 3 * s:.1f} L{x:.1f},{y + 1 * s:.1f} L{x - 4 * s:.1f},{y + 3 * s:.1f} Z" fill="{accent}"/>')
    if key in ("postgresql", "postgres"):
        return (f'<ellipse cx="{x:.1f}" cy="{y - 7 * s:.1f}" rx="{7 * s:.1f}" ry="{3 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<path d="M{x - 7 * s:.1f},{y - 7 * s:.1f} L{x - 7 * s:.1f},{y + 5 * s:.1f} A7,3 0 0 0 {x + 7 * s:.1f},{y + 5 * s:.1f} L{x + 7 * s:.1f},{y - 7 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>')
    if key == "docker":
        return (f'<rect x="{x - 6 * s:.1f}" y="{y - 8 * s:.1f}" width="{12 * s:.1f}" height="{6 * s:.1f}" rx="{1.5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>'
                f'<rect x="{x - 6 * s:.1f}" y="{y - 1 * s:.1f}" width="{12 * s:.1f}" height="{6 * s:.1f}" rx="{1.5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>'
                f'<rect x="{x - 6 * s:.1f}" y="{y + 6 * s:.1f}" width="{12 * s:.1f}" height="{6 * s:.1f}" rx="{1.5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>')
    if key == "vercel":
        return f'<path d="M{x:.1f},{y - 9 * s:.1f} L{x + 9 * s:.1f},{y + 8 * s:.1f} L{x - 9 * s:.1f},{y + 8 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{sw:.1f}" stroke-linejoin="round"/>'
    if key == "render":
        return (f'<rect x="{x - 7 * s:.1f}" y="{y - 7 * s:.1f}" width="{14 * s:.1f}" height="{14 * s:.1f}" rx="{4 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<rect x="{x - 3 * s:.1f}" y="{y - 3 * s:.1f}" width="{6 * s:.1f}" height="{6 * s:.1f}" rx="{2 * s:.1f}" fill="{accent}"/>')
    if key == "cloudflare":
        return f'<path d="M{x - 8 * s:.1f},{y + 3 * s:.1f} A6,6 0 0 1 {x - 2 * s:.1f},{y - 5 * s:.1f} A7,7 0 0 1 {x + 4 * s:.1f},{y - 5 * s:.1f} A6,6 0 0 1 {x + 8 * s:.1f},{y + 3 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linejoin="round"/>'
    if key == "star":
        return f'<polygon points="{star_pts(x, y, 8 * s)}" fill="{accent}"/>'
    if key == "committer":
        return spider_emblem(x, y, 0.5 * s, accent)
    if key == "pullreq":
        return (f'<circle cx="{x - 7 * s:.1f}" cy="{y - 7 * s:.1f}" r="{3.2 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<circle cx="{x + 7 * s:.1f}" cy="{y - 7 * s:.1f}" r="{3.2 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<path d="M{x - 7 * s:.1f},{y - 3.8 * s:.1f} L{x - 7 * s:.1f},{y + 5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<path d="M{x + 7 * s:.1f},{y - 3.8 * s:.1f} L{x + 7 * s:.1f},{y + 1 * s:.1f} C{x + 7 * s:.1f},{y + 5 * s:.1f} {x + 3 * s:.1f},{y + 7 * s:.1f} {x - 1 * s:.1f},{y + 7 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}"/>'
                f'<path d="M{x - 7 * s:.1f},{y + 5 * s:.1f} L{x - 10 * s:.1f},{y + 2 * s:.1f} M{x - 7 * s:.1f},{y + 5 * s:.1f} L{x - 4 * s:.1f},{y + 2 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linecap="round"/>')
    if key == "issues":
        return (f'<path d="M{x:.1f},{y - 9 * s:.1f} L{x + 8 * s:.1f},{y - 4 * s:.1f} L{x + 8 * s:.1f},{y + 2 * s:.1f} C{x + 8 * s:.1f},{y + 6 * s:.1f} {x + 4 * s:.1f},{y + 9 * s:.1f} {x:.1f},{y + 10 * s:.1f} C{x - 4 * s:.1f},{y + 9 * s:.1f} {x - 8 * s:.1f},{y + 6 * s:.1f} {x - 8 * s:.1f},{y + 2 * s:.1f} L{x - 8 * s:.1f},{y - 4 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linejoin="round"/>'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.8 * s:.1f}" fill="{accent}"/>')
    if key == "lang":
        return (f'<path d="M{x - 6 * s:.1f},{y - 8 * s:.1f} C{x - 2 * s:.1f},{y - 4 * s:.1f} {x - 2 * s:.1f},{y + 4 * s:.1f} {x - 6 * s:.1f},{y + 8 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linecap="round"/>'
                f'<path d="M{x + 6 * s:.1f},{y - 8 * s:.1f} C{x + 2 * s:.1f},{y - 4 * s:.1f} {x + 2 * s:.1f},{y + 4 * s:.1f} {x + 6 * s:.1f},{y + 8 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linecap="round"/>'
                f'<circle cx="{x - 4 * s:.1f}" cy="{y - 4 * s:.1f}" r="{2 * s:.1f}" fill="{accent}"/>'
                f'<circle cx="{x + 4 * s:.1f}" cy="{y + 4 * s:.1f}" r="{2 * s:.1f}" fill="{accent}"/>')
    if key == "repo":
        return f'<path d="M{x - 9 * s:.1f},{y - 6 * s:.1f} L{x - 9 * s:.1f},{y + 7 * s:.1f} L{x + 9 * s:.1f},{y + 7 * s:.1f} L{x + 9 * s:.1f},{y - 3 * s:.1f} L{x + 2 * s:.1f},{y - 3 * s:.1f} L{x:.1f},{y - 6 * s:.1f} Z" fill="none" stroke="{accent}" stroke-width="{1.6 * s:.1f}" stroke-linejoin="round"/>'
    if key == "followers":
        return (f'<circle cx="{x - 8 * s:.1f}" cy="{y:.1f}" r="{3 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>'
                f'<circle cx="{x + 8 * s:.1f}" cy="{y:.1f}" r="{3 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>'
                f'<circle cx="{x:.1f}" cy="{y - 8 * s:.1f}" r="{3 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>'
                f'<path d="M{x - 5 * s:.1f},{y - 1.6 * s:.1f} L{x - 3 * s:.1f},{y - 6 * s:.1f} M{x + 5 * s:.1f},{y - 1.6 * s:.1f} L{x + 3 * s:.1f},{y - 6 * s:.1f} M{x - 4 * s:.1f},{y + 1 * s:.1f} L{x + 4 * s:.1f},{y + 1 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.5 * s:.1f}"/>')
    if key == "time":
        return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{8.5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.7 * s:.1f}"/>'
                f'<path d="M{x:.1f},{y - 5 * s:.1f} L{x:.1f},{y:.1f} L{x + 3.5 * s:.1f},{y + 2.5 * s:.1f}" fill="none" stroke="{accent}" stroke-width="{1.7 * s:.1f}" stroke-linecap="round"/>')
    return ""


def build_swing_svg(weeks, real):
    """Cinematic Web Swing: a spider swings along a smooth web arc whose height
    follows the 52-week contribution rhythm, over a fixed city skyline."""
    n = len(weeks)
    maxv = max(weeks) or 1
    W, H = 1000, 300
    gut = 14
    bw = (W - gut * 2) / n
    xs = [gut + i * bw + bw / 2 for i in range(n)]
    ys = [44 + 178 * (1 - weeks[i] / maxv) for i in range(n)]
    fwd = f"M {xs[0]:.1f},{ys[0]:.1f}"
    for i in range(n - 1):
        mx, my = (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2
        fwd += f" Q {xs[i]:.1f},{ys[i]:.1f} {mx:.1f},{my:.1f}"
    fwd += f" L {xs[-1]:.1f},{ys[-1]:.1f}"
    rev = f" M {xs[-1]:.1f},{ys[-1]:.1f}"
    for i in range(n - 1, 0, -1):
        mx, my = (xs[i] + xs[i - 1]) / 2, (ys[i] + ys[i - 1]) / 2
        rev += f" Q {xs[i]:.1f},{ys[i]:.1f} {mx:.1f},{my:.1f}"
    rev += f" L {xs[0]:.1f},{ys[0]:.1f}"
    swing = fwd + rev

    rng = random.Random(42)
    base = 262
    nb = 26
    bbw = (W - 28) / nb
    buildings, windows, heights = "", "", []
    for k in range(nb):
        h = 34 + rng.randint(0, 8) * 8 + (34 if k % 6 == 0 else 0)
        heights.append(h)
        bx = 14 + k * bbw
        col = "#102A45" if h > 80 else "#0D2037"
        buildings += (f'<rect x="{bx:.1f}" y="{base - h:.1f}" width="{bbw:.1f}" height="{h:.1f}" fill="{col}"/>'
                      f'<rect x="{bx:.1f}" y="{base - h:.1f}" width="{bbw:.1f}" height="2" fill="#17365C"/>')
        wk = int(k * n / nb)
        act = weeks[wk] / maxv
        op = min(0.9, 0.12 + act * 0.75)
        for w in range(2 + (k % 3)):
            wx = bx + bbw * (0.3 + 0.25 * w)
            wy = base - h + 8 + (w % 2) * 12
            tw = (f'<animate attributeName="opacity" values="{op:.2f};{max(0.05, op - 0.3):.2f};{op:.2f}" '
                  f'dur="{2.4 + (w + k) % 4:.1f}s" begin="{(k + w) * 0.23:.1f}s" repeatCount="indefinite"/>'
                  ) if act > 0.25 else ""
            windows += (f'<rect x="{wx:.1f}" y="{wy:.1f}" width="{bbw * 0.16:.1f}" height="3.4" rx="1" '
                        f'fill="#EAF2FF" opacity="{op:.2f}">{tw}</rect>')
    ti = heights.index(max(heights))
    tx = 14 + ti * bbw + bbw / 2
    ty = base - heights[ti]
    antenna = (f'<rect x="{tx - 1:.1f}" y="{ty - 16:.1f}" width="2" height="16" fill="{MUTED}"/>'
               f'<circle cx="{tx:.1f}" cy="{ty - 18:.1f}" r="2.6" fill="{BRIGHT}">'
               f'<animate attributeName="opacity" values="1;0.15;1" dur="1.4s" repeatCount="indefinite"/></circle>')

    webline = (
        f'<path d="{swing}" fill="none" stroke="{WHITE}" stroke-opacity="0.14" stroke-width="1" '
        f'stroke-dasharray="3000" stroke-dashoffset="3000">'
        f'<animate attributeName="stroke-dashoffset" from="3000" to="0" dur="3s" begin="0.5s" fill="freeze"/></path>'
        f'<path d="{swing}" fill="none" stroke="{RED}" stroke-opacity="0.06" stroke-width="6"/>'
    )
    spider = (
        f'<g><animateMotion dur="26s" repeatCount="indefinite" path="{swing}"/>'
        f'<line x1="0" y1="0" x2="0" y2="12" stroke="{WHITE}" stroke-width="1" stroke-opacity="0.5"/>'
        f'<g transform="translate(0,12)">'
        f'<ellipse cx="0" cy="0" rx="3.4" ry="5" fill="{RED}"/><circle cx="0" cy="-5.5" r="2.2" fill="{RED}"/>'
        f'<g stroke="{RED}" stroke-width="1.1" stroke-linecap="round" fill="none">'
        f'<path d="M-2.2,-2.2 L-6,-5"/><path d="M-2.4,0 L-6.4,1"/><path d="M-2.2,2 L-5.4,5"/>'
        f'<path d="M2.2,-2.2 L6,-5"/><path d="M2.4,0 L6.4,1"/><path d="M2.2,2 L5.4,5"/>'
        f'</g></g>'
        f'<circle cx="0" cy="0" r="6" fill="none" stroke="{BRIGHT}" stroke-width="1">'
        f'<animate attributeName="r" values="4;15" dur="2.6s" repeatCount="indefinite"/>'
        f'<animate attributeName="opacity" values="0.8;0" dur="2.6s" repeatCount="indefinite"/></circle>'
        f'</g>'
    )
    corner_webs = (
        f'<g stroke="{WHITE}" stroke-opacity="0.08" stroke-width="1" fill="none">'
        f'<path d="M0,0 L220,120 M0,0 L120,150 M0,0 L30,180"/>'
        f'<path d="M1000,0 L780,120 M1000,0 L880,150 M1000,0 L970,180"/>'
        f'</g>'
    )
    tag = "LIVE · 52-WEEK SWING" if real else "DEMO · 52-WEEK SWING"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Web Swing — contribution rhythm as a swing arc over the city">
<defs><radialGradient id="cityGlow" cx="0.5" cy="1" r="0.7">
<stop offset="0" stop-color="{RED}" stop-opacity="0.20"/><stop offset="1" stop-color="{RED}" stop-opacity="0"/>
</radialGradient></defs>
<rect width="{W}" height="{H}" fill="{CARD}"/>
<rect width="{W}" height="{H}" fill="url(#cityGlow)"/>
<text x="26" y="36" font-family="{FONT_DISP}" font-size="22" letter-spacing="3" fill="{WHITE}">WEB SWING</text>
<text x="974" y="34" text-anchor="end" font-family="{FONT_MONO}" font-size="11" letter-spacing="2" fill="{MUTED}">{tag}</text>
<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="1.4s" begin="0.4s" fill="freeze"/>
{buildings}
{antenna}
</g>
{windows}
{corner_webs}
{webline}
{spider}
<line x1="14" y1="{base + 10}" x2="{W - 14}" y2="{base + 10}" stroke="{RED}" stroke-width="1.5" stroke-opacity="0.35"/>
</svg>
"""


def tech_icon(slug, cx, cy, size=1.0):
    """Real brand glyph from tech_icons.py (simple-icons path data), centered at
    (cx, cy) and scaled. Icons with no brand hex render white for dark cards."""
    label, hexv, d = TECH_ICONS[slug]
    fill = hexv if hexv else WHITE
    return (f'<g transform="translate({cx - 12 * size:.2f}, {cy - 12 * size:.2f}) scale({size:.3f})">'
            f'<path d="{d}" fill="{fill}"/></g>')


ARSENAL_GROUPS = [
    ("CORE LANGUAGES",   BLUE,      ["python", "typescript", "javascript", "html5", "css3"]),
    ("AI & ML",          "#2BD576", ["jupyter", "openrouter"]),
    ("BACKEND",          RED,       ["fastapi", "nodedotjs"]),
    ("FRONTEND",         BRIGHT,    ["react", "vite"]),
    ("DATABASES",        MUTED,     ["postgresql"]),
    ("DEPLOY & DEV-OPS", BLUE,      ["docker", "vercel", "render", "cloudflare", "githubactions"]),
]


def build_arsenal_svg(real):
    """Full-width categorized arsenal: real brand icons (simple-icons path data)
    in a 3x2 grid of mission-type panels, one tile per tool."""
    W, H = 1000, 520
    tag = "LIVE · TOOL NETWORK" if real else "DEMO · TOOL NETWORK"
    total = sum(len(items) for _, _, items in ARSENAL_GROUPS)
    tw, tg, th = 92, 8, 48
    pcol = [20, 348, 676]
    prow = [62, 240]
    pw, ph = 304, 164
    panels = ""
    ti = 0
    for g, (cat_raw, accent, items) in enumerate(ARSENAL_GROUPS):
        cat = cat_raw.replace("&", "&amp;")
        px, py = pcol[g % 3], prow[g // 3]
        row1 = min(3, len(items))
        row2 = len(items) - row1
        tile_rows = [row1] if row2 == 0 else [row1, row2]
        tiles = ""
        k = 0
        for r, cnt in enumerate(tile_rows):
            off = (pw - (cnt * tw + (cnt - 1) * tg)) / 2
            ty = py + 52 + r * (th + 8)
            for c in range(cnt):
                slug = items[k]
                label = TECH_ICONS[slug][0]
                tx = px + off + c * (tw + tg)
                tiles += (
                    f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" '
                    f'begin="{0.4 + 0.06 * ti:.2f}s" fill="freeze"/>'
                    f'<rect x="{tx:.1f}" y="{ty}" width="{tw}" height="{th}" rx="10" fill="#0B1728" stroke="{accent}" stroke-opacity="0.55"/>'
                    f'<rect x="{tx + 3:.1f}" y="{ty + 3}" width="{tw - 6}" height="2" rx="1" fill="{accent}" fill-opacity="0.35"/>'
                    f'{tech_icon(slug, tx + tw / 2, ty + 17, 0.92)}'
                    f'<text x="{tx + tw / 2:.1f}" y="{ty + 39:.1f}" text-anchor="middle" font-family="{FONT_MONO}" '
                    f'font-size="9" font-weight="bold" fill="{WHITE}">{label}</text>'
                    f'</g>'
                )
                k += 1
                ti += 1
        panels += (
            f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="{0.2 + 0.1 * g:.2f}s" fill="freeze"/>'
            f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="14" fill="{CARD}" stroke="{BORDER}"/>'
            f'<rect x="{px}" y="{py}" width="{pw}" height="3" rx="1.5" fill="{accent}" fill-opacity="0.85"/>'
            f'<circle cx="{px + 16}" cy="{py + 19}" r="3" fill="{accent}">'
            f'<animate attributeName="opacity" values="1;0.3;1" dur="2.2s" begin="{0.6 + 0.15 * g:.2f}s" repeatCount="indefinite"/></circle>'
            f'<text x="{px + 27}" y="{py + 23}" font-family="{FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="2.5" fill="{WHITE}">{cat}</text>'
            f'<text x="{px + pw - 16}" y="{py + 23}" text-anchor="end" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">{len(items)} WEAPONS</text>'
            f'<line x1="{px + 16}" y1="{py + 34}" x2="{px + pw - 16}" y2="{py + 34}" stroke="{BORDER}" stroke-width="1"/>'
            f'{tiles}</g>'
        )
    footer = (
        f'<line x1="30" y1="452" x2="970" y2="452" stroke="{RED}" stroke-width="2" stroke-opacity="0.35"/>'
        f'<text x="40" y="478" font-family="{FONT_MONO}" font-size="11" letter-spacing="3" fill="{MUTED}">ARSENAL</text>'
        f'<text x="132" y="478" font-family="{FONT_DISP}" font-size="18" letter-spacing="1" fill="{WHITE}">{total} WEAPONS ONLINE</text>'
        f'<circle cx="480" cy="474" r="3.4" fill="#2BD576">'
        f'<animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite"/></circle>'
        f'<text x="492" y="478" font-family="{FONT_MONO}" font-size="11" letter-spacing="2" fill="#2BD576">ARSENAL READY</text>'
        f'<text x="970" y="478" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="1" fill="{MUTED}">{tag}</text>'
    )
    header = (
        f'<text x="30" y="42" font-family="{FONT_DISP}" font-size="22" letter-spacing="3" fill="{WHITE}">WEB ARSENAL</text>'
        f'<text x="226" y="44" font-family="{FONT_MONO}" font-size="11" letter-spacing="2" fill="{MUTED}">// TOOL NETWORK</text>'
        f'<text x="970" y="36" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="2" fill="{MUTED}">{tag}</text>'
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Web Arsenal — developer toolbox with real brand icons">
<rect width="{W}" height="{H}" rx="16" fill="{CARD}" stroke="{BORDER}"/>
<g stroke="{WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="1000" y2="520"/><line x1="1000" y1="0" x2="0" y2="520"/>
<circle cx="500" cy="260" r="210"/><circle cx="500" cy="260" r="340"/>
</g>
{header}
{panels}
{footer}
</svg>
"""


ACH_CARDS = [
    ("committer", "COMMITS",       lambda h: h["commits"],        500, "WEB SHOTS FIRED"),
    ("star",      "STARS",         lambda h: h["stars"],          100, "CITIZENS SAVED"),
    ("pullreq",   "PULL REQUESTS", lambda h: h["prs"],            25,  "TEAM-UPS"),
    ("issues",    "ISSUES CLOSED", lambda h: h["issues"],         20,  "VILLAINS DEFEATED"),
    ("lang",      "LANGUAGES",     lambda h: h["languages"],      8,   "LANGUAGES"),
    ("repo",      "REPOSITORIES",  lambda h: h["repos"],          40,  "MISSIONS"),
    ("followers", "FOLLOWERS",     lambda h: h["followers"],      100, "SPIDER-SENSE NETWORK"),
    ("time",      "YEARS ACTIVE",  lambda h: h["account_years"],  3,   "IN THE CITY"),
]

TIER_RANKS = [
    (75, "S", "#2BD576", 4),
    (50, "A", BLUE, 3),
    (25, "B", BRIGHT, 2),
    (10, "C", RED, 1),
]
TIER_DEFAULT = ("D", MUTED, 0)


def tier_of(pct):
    for th, letter, color, pts in TIER_RANKS:
        if pct >= th:
            return letter, color, pts
    return TIER_DEFAULT


def build_achievements_svg(hero, langs, real):
    """Rank-card achievements: one card per stat with a tier letter, progress
    bar and counter, feeding a shared HERO XP bar with a rank title."""
    W, H = 1000, 520
    tag = "LIVE · RANKS" if real else "DEMO · RANKS"
    cards = ""
    xp_total = 0
    for i, (key, name, get, thr, caption) in enumerate(ACH_CARDS):
        val = get(hero)
        pct = min(100.0, val / thr * 100.0) if thr else 0.0
        letter, color, pts = tier_of(pct)
        xp_total += pts
        col, row = i % 4, i // 4
        bx = 20 + col * (229 + 14)
        by = 70 + row * (170 + 16)
        fw = 189
        cards += (
            f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="{0.2 + 0.08 * i}s" fill="freeze"/>'
            f'<rect x="{bx}" y="{by}" width="229" height="170" rx="14" fill="#0B1728" stroke="{BORDER}"/>'
            f'<rect x="{bx}" y="{by}" width="229" height="3" fill="{color}" fill-opacity="0.8"/>'
            f'<rect x="{bx + 16}" y="{by + 16}" width="34" height="34" rx="8" fill="{CARD}" stroke="{color}" stroke-width="1.3"/>'
            f'{icon_glyph(key, bx + 33, by + 33, color, 0.9)}'
            f'<circle cx="{bx + 196}" cy="{by + 24}" r="15" fill="{CARD}" stroke="{color}" stroke-width="1.6"/>'
            f'<text x="{bx + 196}" y="{by + 29}" text-anchor="middle" font-family="{FONT_DISP}" font-size="16" fill="{color}">{letter}</text>'
            f'<text x="{bx + 62}" y="{by + 34}" font-family="{FONT_DISP}" font-size="16" letter-spacing="0.5" fill="{WHITE}">{name}</text>'
            f'<text x="{bx + 16}" y="{by + 66}" font-family="{FONT_MONO}" font-size="8.5" letter-spacing="1.5" fill="{MUTED}">{caption}</text>'
            f'<rect x="{bx + 16}" y="{by + 84}" width="{fw}" height="8" rx="4" fill="{CARD}" stroke="{BORDER}"/>'
            f'<rect x="{bx + 17}" y="{by + 85}" width="{fw * pct / 100:.1f}" height="6" rx="3" fill="{color}">'
            f'<animate attributeName="width" from="0" to="{fw * pct / 100:.1f}" dur="1s" begin="{0.4 + 0.08 * i}s" fill="freeze"/></rect>'
            f'<text x="{bx + 16}" y="{by + 116}" font-family="{FONT_BODY}" font-size="13" font-weight="700" fill="{WHITE}">{val:,}</text>'
            f'<text x="{bx + 78}" y="{by + 116}" font-family="{FONT_MONO}" font-size="10" fill="{MUTED}">/ {thr:,}</text>'
            f'<text x="{bx + 213}" y="{by + 116}" text-anchor="end" font-family="{FONT_MONO}" font-size="10" font-weight="bold" fill="{color}">+{pts} XP</text>'
            f'</g>'
        )
    xp_pct = xp_total / 32.0
    if xp_pct < 0.2:
        rank, rank_color = "ROOKIE", MUTED
    elif xp_pct < 0.4:
        rank, rank_color = "WEB SLINGER", RED
    elif xp_pct < 0.6:
        rank, rank_color = "NEIGHBORHOOD HERO", BRIGHT
    elif xp_pct < 0.8:
        rank, rank_color = "HERO OF THE CITY", BLUE
    else:
        rank, rank_color = "SPIDER-VERSE LEGEND", "#2BD576"
    xp_bar = (
        f'<text x="120" y="473" font-family="{FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="3" fill="{MUTED}">HERO XP</text>'
        f'<text x="470" y="473" font-family="{FONT_MONO}" font-size="12" font-weight="bold" fill="{rank_color}">{xp_total} /32 XP</text>'
        f'<rect x="430" y="462" width="340" height="14" rx="7" fill="#0B1728" stroke="{BORDER}" stroke-width="1"/>'
        f'<rect x="431" y="463" width="{338 * xp_pct:.1f}" height="12" rx="6" fill="{rank_color}" fill-opacity="0.9">'
        f'<animate attributeName="width" from="0" to="{338 * xp_pct:.1f}" dur="1.4s" begin="1s" fill="freeze"/></rect>'
        f'<text x="790" y="473" font-family="{FONT_DISP}" font-size="22" letter-spacing="1" fill="{rank_color}">{rank}</text>'
        f'<text x="960" y="478" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="1" fill="{MUTED}">{tag}</text>'
        f'{spider_emblem(120, 470, 0.32)}'
    )
    header = (
        f'<text x="30" y="42" font-family="{FONT_DISP}" font-size="22" letter-spacing="3" fill="{WHITE}">HERO ACHIEVEMENTS</text>'
        f'<text x="316" y="44" font-family="{FONT_MONO}" font-size="11" letter-spacing="2" fill="{MUTED}">// RANK CARDS</text>'
        f'<text x="960" y="36" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="2" fill="{MUTED}">{tag}</text>'
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Hero Achievements — rank cards with tier letters and XP">
<rect width="{W}" height="{H}" rx="16" fill="{CARD}" stroke="{BORDER}"/>
<g stroke="{WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="500" y2="520"/><line x1="500" y1="0" x2="1000" y2="520"/>
<circle cx="250" cy="240" r="200"/><circle cx="750" cy="240" r="200"/>
</g>
{header}
{cards}
{xp_bar}
</svg>
"""


def build_hero_stats_svg(hero, real, top_lang):
    """Headline stats HUD with a letter-grade rating calculator. Five weighted
    metrics score 0-100; the score maps to a grade band and rank title."""
    W, H = 1000, 520
    lang_name = (top_lang[0] or "OTHER").upper()
    lang_pct = max(6.0, min(100.0, top_lang[1]))
    tag = "LIVE" if real else "DEMO"
    score, letter, gcol, band = hero_grade(hero)
    parts = grade_parts(hero)
    # ---- header
    header = (
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.7s" begin="0.2s" fill="freeze"/>'
        f'{spider_emblem(36, 36, 0.34)}'
        f'<text x="62" y="42" font-family="{FONT_DISP}" font-size="26" letter-spacing="3" fill="{WHITE}">HERO STATS</text>'
        f'<text x="252" y="44" font-family="{FONT_MONO}" font-size="12" letter-spacing="2" fill="{MUTED}">// PROFILE TELEMETRY</text>'
        f'<circle cx="866" cy="34" r="4" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite"/></circle>'
        f'<circle cx="866" cy="34" r="4" fill="none" stroke="#2BD576" stroke-width="1"><animate attributeName="r" values="4;12" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="2.2s" repeatCount="indefinite"/></circle>'
        f'<text x="878" y="39" font-family="{FONT_MONO}" font-size="12" letter-spacing="2" fill="#2BD576">ONLINE</text>'
        f'<text x="960" y="58" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="1" fill="{MUTED}">ARSENAL LEAD · {lang_name} {lang_pct:.0f}%</text>'
        f'</g>'
    )
    # ---- grade badge (center)
    defs = (
        f'<radialGradient id="gGlow" gradientUnits="userSpaceOnUse" cx="180" cy="205" r="92">'
        f'<stop offset="0" stop-color="{gcol}" stop-opacity="0.28"/><stop offset="0.7" stop-color="{gcol}" stop-opacity="0.06"/><stop offset="1" stop-color="{gcol}" stop-opacity="0"/></radialGradient>'
        f'<linearGradient id="gDash" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{gcol}"/><stop offset="1" stop-color="{BRIGHT}"/></linearGradient>'
    )
    grade = (
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.6s" fill="freeze"/>'
        f'<circle cx="180" cy="205" r="92" fill="url(#gGlow)"/>'
        f'<circle cx="180" cy="205" r="88" fill="#0B1728" stroke="{BORDER}" stroke-width="1.5"/>'
        f'<circle cx="180" cy="205" r="88" fill="none" stroke="url(#gDash)" stroke-width="2.5" stroke-dasharray="14 10" stroke-linecap="round">'
        f'<animateTransform attributeName="transform" type="rotate" from="0 180 205" to="360 180 205" dur="28s" repeatCount="indefinite"/></circle>'
        f'{spider_emblem(180, 158, 0.34, gcol)}'
        f'<text x="180" y="232" text-anchor="middle" font-family="{FONT_DISP}" font-size="64" letter-spacing="2" fill="{gcol}">{letter}</text>'
        f'<text x="180" y="262" text-anchor="middle" font-family="{FONT_MONO}" font-size="13" font-weight="bold" fill="{WHITE}">{score} /100</text>'
        f'<text x="180" y="308" text-anchor="middle" font-family="{FONT_DISP}" font-size="15" letter-spacing="2" fill="{gcol}">{band}</text>'
        f'<text x="180" y="92" text-anchor="middle" font-family="{FONT_MONO}" font-size="12" letter-spacing="3" fill="{MUTED}">HERO RATING</text>'
        f'</g>'
    )
    # ---- stat rows
    rows = ""
    row_defs = [
        ("WEB SHOTS",      "COMMITS · 365D",   f"{hero['commits']:,}", "#E62429"),
        ("CITIZENS SAVED", "STARS EARNED",     f"{hero['stars']:,}",   "#FF3340"),
        ("TEAM-UPS",       "PULL REQUESTS",    f"{hero['prs']:,}",     "#1976D2"),
        ("VILLAINS DOWN",  "ISSUES CLOSED",    f"{hero['issues']:,}",  "#8B9BB4"),
        ("NETWORK",        "FOLLOWERS",        f"{hero['followers']:,}", "#2BD576"),
    ]
    for i, (label, caption, value, accent) in enumerate(row_defs):
        y = 82 + i * 46
        rows += (
            f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="{0.7 + 0.12 * i:.2f}s" fill="freeze"/>'
            f'<rect x="330" y="{y - 20}" width="630" height="38" rx="8" fill="#0B1728" stroke="{BORDER}"/>'
            f'<circle cx="352" cy="{y}" r="3" fill="{accent}">'
            f'<animate attributeName="opacity" values="1;0.35;1" dur="{2 + i * 0.3:.1f}s" repeatCount="indefinite"/></circle>'
            f'<text x="366" y="{y + 4}" font-family="{FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="2" fill="{WHITE}">{label}</text>'
            f'<text x="832" y="{y + 4}" text-anchor="end" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">{caption}</text>'
            f'<text x="940" y="{y + 6}" text-anchor="end" font-family="{FONT_DISP}" font-size="28" letter-spacing="1" fill="{accent}">{value}</text>'
            f'</g>'
        )
    # ---- rating calculator
    calc = ""
    calc_parts = [
        ("COMMITS",  30, parts[0]),
        ("STARS",    25, parts[1]),
        ("PULL REQS",20, parts[2]),
        ("ISSUES",   10, parts[3]),
        ("REPOS",    15, parts[4]),
    ]
    for i, (name, mx, (label, sub, wmax)) in enumerate(calc_parts):
        x = 40 + i * 192
        calc += (
            f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="{1.4 + 0.1 * i:.2f}s" fill="freeze"/>'
            f'<text x="{x + 86}" y="392" text-anchor="middle" font-family="{FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="1" fill="{WHITE}">{name}</text>'
            f'<rect x="{x}" y="402" width="172" height="10" rx="5" fill="#0B1728" stroke="{BORDER}"/>'
            f'<rect x="{x + 1}" y="403" width="{170 * sub / wmax:.1f}" height="8" rx="4" fill="{gcol}" fill-opacity="0.9">'
            f'<animate attributeName="width" from="0" to="{170 * sub / wmax:.1f}" dur="0.9s" begin="{1.6 + 0.1 * i:.2f}s" fill="freeze"/></rect>'
            f'<text x="{x + 86}" y="434" text-anchor="middle" font-family="{FONT_MONO}" font-size="10" fill="{WHITE}">{sub:.1f}</text>'
            f'<text x="{x + 86}" y="447" text-anchor="middle" font-family="{FONT_MONO}" font-size="8.5" fill="{MUTED}">/ {wmax}</text>'
            f'</g>'
        )
    calc_block = (
        f'<line x1="40" y1="340" x2="960" y2="340" stroke="{RED}" stroke-width="2" stroke-opacity="0.35"/>'
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="1.3s" fill="freeze"/>'
        f'<text x="40" y="368" font-family="{FONT_MONO}" font-size="12" font-weight="bold" letter-spacing="3" fill="{MUTED}">RATING CALCULATOR</text>'
        f'<text x="960" y="368" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="1" fill="{MUTED}">WEIGHTED SCORE · MAX {score}</text>'
        f'</g>'
        f'{calc}'
        f'<text x="40" y="494" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">SCORE = COMMITS·30% + STARS·25% + PULL REQUESTS·20% + ISSUES·10% + REPOS·15%</text>'
        f'<text x="40" y="510" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">EACH METRIC CAPPED · GRADE = {letter} ({score}/100) · {band}</text>'
        f'<text x="960" y="510" text-anchor="end" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">{tag} · GITHUB TELEMETRY</text>'
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Hero Stats — headline stats with a letter-grade rating">
<defs>{defs}</defs>
<rect width="{W}" height="{H}" rx="16" fill="{CARD}" stroke="{BORDER}"/>
<g stroke="{WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="500" y2="520"/><line x1="500" y1="0" x2="1000" y2="520"/>
<circle cx="500" cy="260" r="240"/><circle cx="500" cy="260" r="420"/>
</g>
{header}
{grade}
{rows}
{calc_block}
</svg>
"""


def build_streak_svg(hero, real):
    """Streak pulse: current + longest streak, total contributions, and
    commit/star bars — the contribution stats GitHub visitors care about."""
    W, H = 1000, 340
    tag = "LIVE · CONTRIBUTION PULSE" if real else "DEMO · CONTRIBUTION PULSE"
    cur, lon = hero["current_streak"], hero["longest_streak"]
    flame = (
        f'<g opacity="0.9"><animate attributeName="opacity" values="0.9;0.55;0.9" dur="1.6s" repeatCount="indefinite"/>'
        f'<path d="M318,80 C312,90 306,98 306,106 C306,114 312,118 318,118 C324,118 330,114 330,106 C330,98 324,90 318,80 Z" fill="#E62429"/>'
        f'<path d="M318,88 C314,94 311,99 311,104 C311,109 314,112 318,112 C322,112 325,109 325,104 C325,99 322,94 318,88 Z" fill="#FFB020"/>'
        f'</g>'
    )
    npill = min(12, max(1, cur))
    pills = ""
    for k in range(npill):
        px = 56 + k * 24
        pills += (
            f'<rect x="{px}" y="196" width="22" height="16" rx="4" fill="#12402E" stroke="#2BD576" stroke-width="1">'
            f'<animate attributeName="fill" values="#12402E;#12402E;#2BD576" keyTimes="0;{0.8 + 0.02 * k:.2f};1" dur="2s" begin="{0.3 + 0.12 * k:.2f}s" fill="freeze"/></rect>'
            f'<text x="{px + 11}" y="207" text-anchor="middle" font-family="{FONT_MONO}" font-size="8" fill="#EAF2FF">{k + 1}</text>'
        )
    streak_card = (
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.4s" fill="freeze"/>'
        f'<rect x="40" y="64" width="330" height="162" rx="12" fill="#0B1728" stroke="{BORDER}"/>'
        f'<text x="58" y="94" font-family="{FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="3" fill="{RED}">CURRENT STREAK</text>'
        f'{flame}'
        f'<text x="66" y="154" font-family="{FONT_DISP}" font-size="58" letter-spacing="1" fill="{WHITE}">{cur}</text>'
        f'<text x="142" y="152" font-family="{FONT_MONO}" font-size="14" letter-spacing="1" fill="{MUTED}">DAY(S)</text>'
        f'<text x="66" y="180" font-family="{FONT_MONO}" font-size="11" font-weight="bold" letter-spacing="1" fill="#2BD576">{hero["current_range"]}</text>'
        f'{pills}'
        f'</g>'
    )
    cards = (
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.7s" fill="freeze"/>'
        f'<rect x="390" y="64" width="582" height="76" rx="12" fill="#0B1728" stroke="{BORDER}"/>'
        f'<circle cx="408" cy="92" r="3" fill="#2BD576"><animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite"/></circle>'
        f'<text x="420" y="96" font-family="{FONT_MONO}" font-size="10" letter-spacing="2" fill="{MUTED}">TOTAL CONTRIBUTIONS</text>'
        f'<text x="944" y="126" text-anchor="end" font-family="{FONT_DISP}" font-size="40" letter-spacing="1" fill="{WHITE}">{hero["total_contribs"]:,}</text>'
        f'<text x="944" y="146" text-anchor="end" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">{hero["window"]}</text>'
        f'</g>'
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.9s" fill="freeze"/>'
        f'<rect x="390" y="150" width="582" height="76" rx="12" fill="#0B1728" stroke="{BORDER}"/>'
        f'<circle cx="408" cy="178" r="3" fill="#FF3340"><animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite"/></circle>'
        f'<text x="420" y="182" font-family="{FONT_MONO}" font-size="10" letter-spacing="2" fill="{MUTED}">LONGEST STREAK</text>'
        f'<text x="944" y="212" text-anchor="end" font-family="{FONT_DISP}" font-size="40" letter-spacing="1" fill="{WHITE}">{lon} DAYS</text>'
        f'<text x="944" y="232" text-anchor="end" font-family="{FONT_MONO}" font-size="9" letter-spacing="1" fill="{MUTED}">{hero["longest_range"]}</text>'
        f'</g>'
    )
    commit_w = 398 * min(hero["commits"], 600) / 600
    star_w = 398 * min(hero["stars"], 100) / 100
    bars = (
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="1.1s" fill="freeze"/>'
        f'<text x="40" y="266" font-family="{FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="2" fill="{MUTED}">TOTAL COMMITS</text>'
        f'<rect x="40" y="274" width="400" height="10" rx="5" fill="#0B1728" stroke="{BORDER}"/>'
        f'<rect x="41" y="275" width="{commit_w:.1f}" height="8" rx="4" fill="{RED}">'
        f'<animate attributeName="width" from="0" to="{commit_w:.1f}" dur="1s" begin="1.3s" fill="freeze"/></rect>'
        f'<text x="452" y="285" font-family="{FONT_DISP}" font-size="20" fill="{RED}">{hero["commits"]:,}</text>'
        f'<text x="560" y="266" font-family="{FONT_MONO}" font-size="10" font-weight="bold" letter-spacing="2" fill="{MUTED}">TOTAL STARS EARNED</text>'
        f'<rect x="560" y="274" width="400" height="10" rx="5" fill="#0B1728" stroke="{BORDER}"/>'
        f'<rect x="561" y="275" width="{star_w:.1f}" height="8" rx="4" fill="{BRIGHT}">'
        f'<animate attributeName="width" from="0" to="{star_w:.1f}" dur="1s" begin="1.5s" fill="freeze"/></rect>'
        f'<text x="972" y="285" text-anchor="end" font-family="{FONT_DISP}" font-size="20" fill="{BRIGHT}">{hero["stars"]:,}</text>'
        f'</g>'
    )
    header = (
        f'<text x="30" y="42" font-family="{FONT_DISP}" font-size="22" letter-spacing="3" fill="{WHITE}">WEB STREAK</text>'
        f'<text x="222" y="44" font-family="{FONT_MONO}" font-size="11" letter-spacing="2" fill="{MUTED}">// CONTRIBUTION PULSE</text>'
        f'<text x="960" y="36" text-anchor="end" font-family="{FONT_MONO}" font-size="10" letter-spacing="2" fill="{MUTED}">{tag}</text>'
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Web Streak — contribution streak and totals">
<rect width="{W}" height="{H}" rx="16" fill="{CARD}" stroke="{BORDER}"/>
<g stroke="{WHITE}" stroke-opacity="0.04" stroke-width="1" fill="none">
<line x1="0" y1="0" x2="1000" y2="340"/><line x1="1000" y1="0" x2="0" y2="340"/>
<circle cx="500" cy="170" r="150"/><circle cx="500" cy="170" r="260"/>
</g>
{header}
{streak_card}
{cards}
{bars}
</svg>
"""


def main():
    ap = argparse.ArgumentParser(description="Generate Spider-Man theme SVG assets from GitHub data.")
    ap.add_argument("--username", default="Robibiruk")
    ap.add_argument("--token", default=None, help="GitHub PAT (or set GITHUB_TOKEN). Enables the real contribution calendar.")
    ap.add_argument("--out", type=Path, default=ASSETS)
    args = ap.parse_args()
    token = args.token or None
    out = args.out
    out.mkdir(parents=True, exist_ok=True)

    real = False
    weeks, days, langs = None, None, None
    hero = dict(DEFAULT_HERO)
    hero["languages"] = 0
    try:
        repos = fetch_repos(args.username, token)
        totals = fetch_languages(args.username, repos, token)
        sorted_langs = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)
        total_bytes = sum(v for _, v in sorted_langs) or 1
        langs = [(n, v / total_bytes * 100) for n, v in sorted_langs]
        hero["languages"] = len([l for l in langs if l[1] > 1.5])
        hero["stars"] = sum(r.get("stargazers_count", 0) for r in repos)
        hero["repos"] = len(repos)
        hero["prs"] = fetch_merged_prs(args.username, token)
        prof = http_get(f"{API}/users/{args.username}")
        hero["followers"] = prof.get("followers", hero["followers"])
        created = prof.get("created_at", "")
        if created:
            d0 = datetime.datetime.strptime(created[:10], "%Y-%m-%d").date()
            hero["account_years"] = max(1, round((datetime.date.today() - d0).days / 365))
            hero["created"] = d0.strftime("%b %d, %Y").upper().replace("0", " ")
            hero["window"] = "SINCE " + hero["created"]
        if token:
            weeks, days = fetch_contribution_calendar(args.username, token)
            real = bool(weeks)
            if real and days:
                total, cur_len, cur_range, lon_len, lon_range = streak_analysis(days, datetime.date.today())
                hero["total_contribs"] = total
                hero["current_streak"] = cur_len
                hero["current_range"] = cur_range
                hero["longest_streak"] = lon_len
                hero["longest_range"] = lon_range
    except Exception as exc:
        print(f"[warn] live fetch failed ({exc.__class__.__name__}: {exc}); using stated data", file=sys.stderr)

    if weeks is None:
        weeks = demo_weeks(args.username)
    if langs is None:
        langs = demo_languages(args.username)

    (out / "swing.svg").write_text(build_swing_svg(weeks, real), encoding="utf-8")
    (out / "arsenal.svg").write_text(build_arsenal_svg(real), encoding="utf-8")
    (out / "achievements.svg").write_text(build_achievements_svg(hero, langs, real), encoding="utf-8")
    (out / "hero-stats.svg").write_text(
        build_hero_stats_svg(hero, real, langs[0] if langs else ("OTHER", 1.0)), encoding="utf-8")
    (out / "streak.svg").write_text(build_streak_svg(hero, real), encoding="utf-8")
    print(f"wrote {out / 'swing.svg'}  ({'live' if real else 'demo'} data)")
    print(f"wrote {out / 'arsenal.svg'}  ({sum(len(i) for _, _, i in ARSENAL_GROUPS)} weapons)")
    print(f"wrote {out / 'achievements.svg'}  (rank cards + XP)")
    print(f"wrote {out / 'hero-stats.svg'}  ({'live' if real else 'demo'} grade)")
    print(f"wrote {out / 'streak.svg'}  (streak pulse)")


if __name__ == "__main__":
    main()
