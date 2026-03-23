# CLAUDE.md - FitWord

> **Note to Claude Code:** This template reflects Ido's established preferences and patterns across 7+ projects. Use it as a strong starting point, but feel free to suggest better approaches if the specific project calls for it. Every project is different — adapt, don't blindly follow.

---

## Project Overview

Hebrew mobile-first word game. Player taps 7 fixed letter tiles to build words that fill a target row of 13–16 character slots. Goal: fill the row exactly (Perfect Fit) before the 90-second timer runs out.

**Name:** FitWord
**Type:** Game
**Status:** MVP
**Deploy URL:** TBD
**Repo:** GitHub (idluxman-gif)

---

## Tech Stack

### This Project Uses
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3
- **Animation:** Framer Motion
- **State:** Zustand
- **Deploy:** Vercel
- **PWA:** manifest.json + basic service worker
- **Dictionary:** Hardcoded ~300 Hebrew words (swap-ready via `isValidWord()` abstraction)

No backend, no database, no auth — pure client-side game.

---

## Working Rules

### Ido's Core Principles
1. **Ask before acting** — Never make autonomous decisions. Present options, let Ido choose.
2. **Ship fast, iterate later** — Working MVP beats perfect architecture.
3. **Automate everything** — If a human does it more than twice, script it.
4. **Data over gut** — Quantify decisions.
5. **Kill what doesn't work** — No sunk cost attachment.
6. **Template and scale** — If it works once, make it repeatable.

### Code Style
- Keep it simple. No over-engineering.
- Prefer single-file implementations when complexity allows.
- No unnecessary abstractions.
- Comments only where logic isn't self-evident.
- Error handling at boundaries, not everywhere.

---

## Project Structure

```
/app/page.tsx          ← game screen (start, playing, result)
/app/layout.tsx        ← RTL, PWA meta, viewport
/app/globals.css       ← Tailwind + safe-area
/app/sw-register.tsx   ← service worker registration
/lib/dictionary.ts     ← ~300 Hebrew words + isValidWord()
/lib/game.ts           ← round generation, scoring, solvability check
/lib/store.ts          ← Zustand store
/public/manifest.json  ← PWA manifest
/public/sw.js          ← service worker (app shell cache)
```

---

## Game Rules (Sprint 1)

- 7 fixed Hebrew letter tiles per round (weighted by real frequency)
- Target row: 13–16 character slots, fills RTL
- Letters NOT consumed — reusable throughout round
- Scoring: 10pts/letter, +10 bonus ≥4 chars, +25 bonus ≥6 chars, +100 Perfect Fit, −10 invalid
- WIN: fill row exactly before timer (90s)
- LOSS: timer expires OR stuck (remaining slots < shortest formable word)
- Solvability: verified ≥2 dictionary words formable before presenting round

---

## Deployment
- **Platform:** Vercel
- **Vercel Team:** idols-projects-f51e3e54
- **Environment Variables:** none required
- **Cron Jobs:** none

---

## Current Status & Roadmap

### Done (Sprint 1)
- Game screen with timer, score, remaining slots
- Target row (RTL fill with word-boundary coloring)
- 7 tappable letter tiles (56×56px, Framer Motion tap animation)
- Word builder (tap-only, no keyboard)
- Dictionary (~300 Hebrew words, isValidWord abstraction)
- Round generation with weighted frequency + solvability check
- Scoring system with bonuses
- Win/Loss screens with animations
- PWA setup (manifest + service worker)
- Mobile-first layout (375px iPhone 14)

### Planned (Sprint 2+)
- Expand dictionary (external API or larger word list)
- Sound effects
- Haptic feedback
- Share score
- Daily challenge mode
- Tutorial / onboarding

### Known Issues
- No app icons yet (icon-192.png, icon-512.png referenced but not created)
- Dictionary is basic ~300 words — many common Hebrew words missing

---

## Lessons & Decisions Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-03-23 | Hardcoded dictionary instead of API | Sprint 1 speed; isValidWord() abstraction makes swap easy |
| 2026-03-23 | 7 distinct letters per round | Duplicates add no value since letters aren't consumed |
| 2026-03-23 | Tailwind v3 instead of v4 | v4 uses CSS-based config, v3 is more stable with Next.js 14 |
| 2026-03-23 | flex-wrap letter grid instead of fixed 7-col | 56px tiles can't fit 7-across on 375px; 5+2 layout works |

---

## External References
- Vercel Dashboard: https://vercel.com/idols-projects-f51e3e54
