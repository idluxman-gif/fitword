import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exacto — PM Dashboard',
  description: 'Product management dashboard for Exacto word game',
}

export default function PMPage() {
  return (
    <div dir="ltr" className="min-h-screen bg-[#0a0a12] text-gray-200" style={{ overflow: 'auto', height: 'auto', maxHeight: 'none' }}>
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f0f1a] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Exacto — PM Dashboard</h1>
            <p className="text-sm text-gray-500">Hebrew word game · Last updated: March 24, 2026</p>
          </div>
          <a href="https://fitword.vercel.app" target="_blank" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500">
            Live App →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-12">

        {/* ─── Quick Links ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Live App', url: 'https://fitword.vercel.app', icon: '🎮' },
            { label: 'GitHub Repo', url: 'https://github.com/idluxman-gif/fitword', icon: '📦' },
            { label: 'Vercel Dashboard', url: 'https://vercel.com/idols-projects-f51e3e54/fitword', icon: '▲' },
            { label: 'Firebase Console', url: 'https://console.firebase.google.com', icon: '🔥' },
          ].map((link) => (
            <a key={link.label} href={link.url} target="_blank"
              className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50 transition-colors text-center">
              <span className="text-2xl block mb-1">{link.icon}</span>
              <span className="text-sm text-gray-300">{link.label}</span>
            </a>
          ))}
        </section>

        {/* ─── Project Overview ─── */}
        <Section title="📋 Project Overview">
          <div className="grid md:grid-cols-2 gap-6">
            <InfoCard title="App Name" value="Exacto (formerly FitWord)" />
            <InfoCard title="Stack" value="Next.js 14, Tailwind CSS 3, Framer Motion, Zustand, Firebase Realtime DB" />
            <InfoCard title="Deploy" value="Vercel — fitword.vercel.app" />
            <InfoCard title="Dictionary" value="~14,000 Hebrew words (from Hspell open dataset)" />
            <InfoCard title="Target" value="Mobile-first, RTL, ages 8+" />
            <InfoCard title="Backend" value="Firebase (multiplayer only), otherwise pure client-side" />
          </div>
        </Section>

        {/* ─── What's Done ─── */}
        <Section title="✅ What's Done">
          <div className="space-y-3">
            <StatusItem status="done" text="Core game engine — letter tiles, word validation, scoring (2L=20, 3L=40, 4L=80, 5L=150, 6L=250, 7L=350, 8L=500)" />
            <StatusItem status="done" text="Hebrew dictionary — ~14,000 words from Hspell open dataset, sofit letter normalization (כ↔ך, מ↔ם, נ↔ן, פ↔ף, צ↔ץ)" />
            <StatusItem status="done" text="5 Single-player modes: Quick Game, Endless, Score Rush, Grid, Shapes" />
            <StatusItem status="done" text="Multiplayer (Firebase) — Create/Join with 4-digit code, up to 6 players, shared letters, lobby with ready system, 3-2-1 countdown" />
            <StatusItem status="done" text="All modes playable in multiplayer (Single/Multi toggle + player count dropdown)" />
            <StatusItem status="done" text="Grid Mode — fill a grid matrix with words in 4 directions (↑↓←→), tap to select cell + direction" />
            <StatusItem status="done" text="Shapes Mode — same as Grid but with random shaped boards (animals, objects, abstract), 30+ templates + procedural generation" />
            <StatusItem status="done" text="Score Rush — no rows, just letters + timer. +time per word (2L=+1s, 3L=+2s, 4L=+5s, 5L=+10s, 6L=+15s). Auto-shuffle every 10 words" />
            <StatusItem status="done" text="Level Designer — create custom grid levels, save as packs, share and play" />
            <StatusItem status="done" text="Scoring system with clear bonus messages" />
            <StatusItem status="done" text="Shuffle letters for 50 points" />
            <StatusItem status="done" text="Sound effects (Web Audio API, no files) + haptic feedback" />
            <StatusItem status="done" text="Mute toggle with localStorage persistence" />
            <StatusItem status="done" text="Leave Game button with confirmation dialog in ALL modes" />
            <StatusItem status="done" text="Phone back button triggers leave dialog" />
            <StatusItem status="done" text="PWA setup (manifest.json, service worker, generated icons)" />
            <StatusItem status="done" text="Personal bests tracked in localStorage" />
            <StatusItem status="done" text="RTL throughout, mobile-first (375px), no horizontal scroll" />
            <StatusItem status="done" text="Rebranded from FitWord → Exacto" />
          </div>
        </Section>

        {/* ─── What's Left / Known Issues ─── */}
        <Section title="🔧 What's Left / Known Issues">
          <div className="space-y-3">
            <StatusItem status="bug" text="Multiplayer mode selection — sometimes starts wrong mode (e.g. Shapes selected but row game starts). Routing from HomeScreen → Firebase room → game renderer needs audit" />
            <StatusItem status="bug" text="Multiplayer scoring — scores not syncing correctly in Grid/Shapes modes. Both players getting identical scores (40pts = first-finish bonus only, word scores missing)" />
            <StatusItem status="bug" text="Multiplayer level sync — when all players finish, should end immediately. Currently waits for timer" />
            <StatusItem status="todo" text="Score Rush real-time score display — total at top doesn't update during play, only after level" />
            <StatusItem status="todo" text="Screen fit — some modes still slightly overflow on certain phones (1cm scroll)" />
            <StatusItem status="todo" text="Shapes variety — need to verify randomization and ensure no repetition in early stages" />
            <StatusItem status="todo" text="Grid isolated cell detection — show 'no more moves' when single squares remain" />
            <StatusItem status="todo" text="Tutorial / onboarding for new players" />
            <StatusItem status="todo" text="Share score functionality" />
            <StatusItem status="todo" text="Daily challenge mode" />
            <StatusItem status="todo" text="App icons for real devices (currently generated programmatically)" />
            <StatusItem status="todo" text="Offensive word filter (dictionary is from academic source, should be clean but unverified)" />
          </div>
        </Section>

        {/* ─── Version History ─── */}
        <Section title="📌 Version History">
          <div className="space-y-6">
            <VersionEntry
              version="Sprint 1 — Foundation"
              date="March 23, 2026"
              changes={[
                'Project created: Next.js 14 + Tailwind + Framer Motion + Zustand',
                'Game screen: timer, score, remaining slots, target row (RTL)',
                '7 tappable Hebrew letter tiles (weighted by frequency)',
                'Word builder: tap-only (no keyboard), clear + submit buttons',
                'Dictionary: ~300 hardcoded Hebrew words',
                'Scoring: 10pts/letter + bonuses for length',
                'Win/Loss screens with animations',
                'PWA setup (manifest + service worker)',
                'Mobile-first layout (375px iPhone 14)',
              ]}
            />
            <VersionEntry
              version="Sprint 2 — Modes & Expansion"
              date="March 24, 2026"
              changes={[
                'Rebranded: FitWord → Exacto',
                'Dictionary expanded: ~300 → ~14,000 words (Hspell open dataset)',
                'Sofit letter normalization (שנ matches שן)',
                'Letters increased: 7 → 10 per round',
                'Home screen: 3 mode buttons with personal bests',
                'Endless Mode: shrinking letter count per stage, letter swap every 4 stages',
                'Score Rush Mode: no rows, time-bonus per word, auto-shuffle every 10 words',
                'New scoring: 2L=20, 3L=40, 4L=80, 5L=150, 6L=250, 7L=350, 8L=500',
                'Sound effects (Web Audio API) + haptic feedback',
                'Mute toggle with persistence',
                'PWA icons generated via Canvas',
                '+5s timer flash in Score Rush',
              ]}
            />
            <VersionEntry
              version="Sprint 2.5 — Grid & Shapes"
              date="March 24, 2026"
              changes={[
                'Grid Mode: fill a matrix with words in 4 directions',
                'Shapes Mode: random shaped boards (30+ templates + procedural)',
                'Directional word placement: tap cell → arrow cycles clockwise',
                'Filled cells show white (no letters to avoid crossword confusion)',
                'Isolated cell detection: game over when single squares remain',
                'Undo last word feature',
                'Shuffle letters for 50 points',
              ]}
            />
            <VersionEntry
              version="Sprint 3 — Multiplayer & Polish"
              date="March 24, 2026"
              changes={[
                'Firebase Realtime DB integration for multiplayer',
                'Create/Join with 4-digit numeric code',
                'Up to 6 players per room',
                'All modes playable in multiplayer (Single/Multi toggle)',
                'Shared letters across all players',
                'Lobby with player names + ready system',
                '3-2-1 countdown before game start',
                'First-to-finish bonus: +40 points per round',
                'Level Designer: create, save, share custom grid levels',
                'Leave Game button with confirmation in ALL modes',
                'Phone back button triggers leave dialog',
                'Score bonus messages shown clearly',
                'Perfect Fit bonus removed',
              ]}
            />
          </div>
        </Section>

        {/* ─── Architecture ─── */}
        <Section title="🏗 Architecture">
          <pre className="bg-gray-900 rounded-xl p-4 text-sm text-gray-300 overflow-x-auto">{`
/app
  /page.tsx              ← Main game (all modes + home screen)
  /layout.tsx            ← RTL, PWA meta, viewport
  /globals.css           ← Tailwind + safe-area
  /sw-register.tsx       ← Service worker registration
  /pm/page.tsx           ← This PM dashboard
  /notes/page.tsx        ← Build notes page

/lib
  /dictionary.ts         ← ~14,000 Hebrew words + isValidWord()
  /game.ts               ← Round generation, scoring, solvability
  /store.ts              ← Zustand store (Quick, Endless, Score Rush)
  /grid-store.ts         ← Grid/Shapes mode state
  /multiplayer-store.ts  ← Firebase multiplayer state
  /designer-store.ts     ← Level designer state
  /firebase.ts           ← Firebase config + helpers
  /sound.ts              ← Web Audio API sound effects

/scripts
  /build-dictionary.js   ← Fetches Hspell word list at build time
  /generate-icons.js     ← Generates PWA icons via Canvas

/public
  /manifest.json         ← PWA manifest
  /sw.js                 ← Service worker
  /icon-192.png          ← Generated app icon
  /icon-512.png          ← Generated app icon
          `.trim()}</pre>
        </Section>

        {/* ─── Tech Decisions ─── */}
        <Section title="🧠 Key Decisions">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="py-2 px-3 text-gray-400 font-medium">Decision</th>
                <th className="py-2 px-3 text-gray-400 font-medium">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                ['Hspell dictionary (14K words)', 'Largest free Hebrew word list, AGPL licensed, official ktiv male spelling'],
                ['Firebase over Supabase', 'User has multiple projects planned, Firebase free tier generous, simpler real-time'],
                ['10 letters (up from 7)', 'More word combinations, better solvability, more strategic choices'],
                ['No keyboard input', 'Mobile-first game — tile tapping is more natural and prevents autocorrect issues'],
                ['Sofit normalization', 'Players type regular letters (נ) but dictionary has final forms (ן) — must match both'],
                ['Web Audio API (no files)', 'Zero external dependencies, instant load, small bundle size'],
                ['Zustand over Context', 'Performance: no re-renders, simple API, tiny bundle'],
                ['Tailwind v3 over v4', 'v4 uses CSS-based config, v3 more stable with Next.js 14'],
                ['Shapes: 30+ templates', 'Procedural generation alone produces boring shapes, handcrafted ones are more fun'],
                ['4-digit numeric codes', 'Easier to type on phone, easier to read aloud to friends'],
                ['White filled cells (no letters)', 'Showing letters confused testers into thinking it was a crossword'],
              ].map(([decision, why], i) => (
                <tr key={i}>
                  <td className="py-2 px-3 text-white font-medium">{decision}</td>
                  <td className="py-2 px-3 text-gray-400">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ─── Scoring System ─── */}
        <Section title="💰 Scoring System">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-bold mb-3">Points per word</h4>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800">
                  {[
                    ['2 letters', '20 pts'],
                    ['3 letters', '40 pts'],
                    ['4 letters', '80 pts'],
                    ['5 letters', '150 pts'],
                    ['6 letters', '250 pts'],
                    ['7 letters', '350 pts'],
                    ['8 letters', '500 pts'],
                  ].map(([len, pts]) => (
                    <tr key={len}>
                      <td className="py-1.5 text-gray-300">{len}</td>
                      <td className="py-1.5 text-purple-400 font-bold">{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Bonuses & Penalties</h4>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800">
                  {[
                    ['Stage clear', '+50 pts', 'text-green-400'],
                    ['First to finish (MP)', '+40 pts', 'text-green-400'],
                    ['Invalid word', '-10 pts', 'text-red-400'],
                    ['Shuffle letters', '-50 pts', 'text-yellow-400'],
                  ].map(([label, pts, color]) => (
                    <tr key={label}>
                      <td className="py-1.5 text-gray-300">{label}</td>
                      <td className={`py-1.5 font-bold ${color}`}>{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* ─── Claude Code Session Log ─── */}
        <Section title="🤖 Claude Code — Full Session Log">
          <p className="text-gray-400 text-sm mb-6">
            Complete development conversation between the product owner and Claude Code.
            This is the full build log from project inception through current state.
          </p>

          <div className="space-y-8">

            <LogEntry
              date="March 23, 2026"
              title="Sprint 1 — Project Kickoff"
              content={`
**User prompt:** Build Sprint 1 of FitWord — Hebrew mobile-first word game.
Stack: Next.js 14, Tailwind CSS, Framer Motion, Zustand. Deploy: Vercel.

**What Claude built:**
- Full project setup from scratch (npm init, dependencies, config)
- /lib/dictionary.ts — ~300 Hebrew words with isValidWord() abstraction
- /lib/game.ts — weighted letter selection, solvability check (≥2 formable words), scoring
- /lib/store.ts — Zustand store with full game state
- /app/page.tsx — Start screen, game screen, result screen
- PWA setup (manifest.json, sw.js, service worker registration)

**Solvability check logic confirmed:**
Letters are never consumed, so formability = set membership check.
A word is formable if every character exists in the 7-letter set.
Round generation: pick 7 weighted-random distinct letters → verify ≥2 dictionary words formable → if fails after 10 attempts, fallback to safe preset [מ,ל,ש,ר,ב,ת,א].

**Verification results:**
1. ✅ Start screen renders with "!התחל לשחק" button
2. ✅ Game screen: timer, score, remaining slots, target row, word builder, tiles
3. ✅ Word submission: "פה" accepted, score = 20, row filled RTL with animation
4. ✅ Feedback messages (success/error) with Framer Motion transitions
5. ✅ Loss screen on timer expiry with correct stats
6. ✅ "Play again" instantly starts new round
7. ✅ Mobile layout (375×812) — all 7 tiles within viewport
8. ✅ Production build: 134 kB first load JS
              `}
            />

            <LogEntry
              date="March 24, 2026 — Morning"
              title="Sprint 2 — Rebrand, Dictionary, Modes"
              content={`
**PM spec received:** 11-point Sprint 2 specification covering rebrand, dictionary expansion, 3 game modes, PWA icons, sound/haptics.

**Key changes:**
- FitWord → Exacto (UI, manifest, meta tags)
- Dictionary: ~300 → ~14,000 words (Hspell open dataset from GitHub)
  - Build script: scripts/build-dictionary.js fetches at build time
  - Filters: 2-8 chars, Hebrew letters only, no niqqud
  - Manual supplement list for missing common words
- Letters: 7 → 10 per round
- Sofit normalization: tiles show כ,מ,נ,פ,צ but dictionary has ך,ם,ן,ף,ץ → canFormWord() handles both
- Home screen: 3 mode buttons (Quick, Endless, Score Rush) with personal bests from localStorage
- Endless Mode: 10 letters Stage 1, -1 each stage (floor 4), letter swap every 4 stages, 90s timer
- Score Rush: no rows, +time per valid word, auto-shuffle every 10 words, earn manual shuffle tokens
- Scoring updated: 2L=20, 3L=40, 4L=80, 5L=150, 6L=250, 7L=350, 8L=500
- Sound: Web Audio API (tile tap, valid word, invalid, perfect fit, stage clear)
- Haptic: navigator.vibrate() patterns
- PWA icons: generated via Canvas (purple bg, white "X")
              `}
            />

            <LogEntry
              date="March 24, 2026 — Midday"
              title="Grid & Shapes Modes"
              content={`
**User request:** Instead of filling rows, add a Grid mode where the screen is filled with squares in a matrix. Player taps a square, arrow shows direction, types word to fill cells. Harder version: Shapes (random shapes instead of rectangles).

**Implementation:**
- Grid Mode: NxN matrix, tap cell to select, click same cell to cycle direction (←↑→↓)
- Valid words fill cells with white color (no letters shown — avoids crossword confusion)
- Shapes Mode: 30+ handcrafted templates + procedural generation
  - Templates: heart, star, cross, L-shape, T-shape, diamond, arrow, animals, etc.
  - Each shape guarantees minimum 2-cell runs in at least one direction
- Isolated cell detection: if any remaining empty cell has no adjacent empty neighbor → "no more moves" game over
- New grid-store.ts for grid/shapes state management
- Undo last word feature added
              `}
            />

            <LogEntry
              date="March 24, 2026 — Afternoon"
              title="Multiplayer & Firebase"
              content={`
**User request:** Add multiplayer — create/join with code, up to 6 players, all modes.

**Decision:** Firebase Realtime DB chosen over Supabase (user has multiple projects planned, Firebase free tier generous).

**Implementation:**
- Firebase project created and configured
- 4-digit numeric room codes (easier to type/read aloud on phone)
- Room structure: letters, gameMode, maxPlayers, players map
- Lobby: player names, ready toggles, game starts when all ready
- 3-2-1 countdown before game start
- All 5 modes playable in multiplayer via Single/Multi toggle on home screen
- Shared letters: host generates, all players use same set
- First-to-finish bonus: +40 points per round
- Opponent score bars shown during gameplay

**Bugs found during testing:**
- Mode selection not propagating to game renderer (Shapes selected → row game starts)
- Score sync issues in Grid/Shapes multiplayer
- Level doesn't end when all players finish (waits for timer)
              `}
            />

            <LogEntry
              date="March 24, 2026 — Evening"
              title="Polish & Bug Fixes"
              content={`
**Fixes applied:**
- Leave Game button: confirmation dialog added to ALL modes including Score Rush
- Exit dialog: now closes immediately on "יציאה" click (was persisting)
- Phone back button: pushes history state on game start, pops it to show leave dialog (not direct exit)
- Dictionary additions: מש (moving), לק (nail polish), and 30+ common words
- Screen overflow: html/body locked to 100dvh with overflow:hidden
- Score Rush: undo/shuffle row hidden (already in top bar)
- Grid cells: show white fill only (no letters)
- Perfect Fit bonus removed (was +100, now 0)
- Bonus messages shown clearly on screen

**Score Rush redesign:**
- No levels, no rows — just 10 letters + timer
- Time bonuses: 2L=+1s, 3L=+2s, 4L=+5s, 5L=+10s, 6L=+15s
- Every 10 correct words → auto-shuffle + earn manual shuffle token
- Manual shuffle costs 50 pts ("buy shuffle" like lives)
- Big score popup in center with fade in/out effect
              `}
            />

          </div>
        </Section>

        {/* ─── Game Modes Reference ─── */}
        <Section title="🎮 Game Modes Reference">
          <div className="grid gap-6">
            {[
              {
                name: 'משחק מהיר (Quick Game)',
                desc: 'Fill a row of 13-16 slots with words. 10 letters, 90 seconds. Single round.',
                timer: '90s',
                letters: '10',
              },
              {
                name: 'אינסוף (Endless)',
                desc: 'Row is always 15 slots. Each stage you lose 1 letter (floor: 4). Letter swap every 4 stages. Run ends on first fail.',
                timer: '90s/stage',
                letters: '10 → 4',
              },
              {
                name: 'ריצת ניקוד (Score Rush)',
                desc: 'No rows. Just letters + timer. Each valid word adds time. Every 10 words = auto-shuffle + free shuffle token. Survive as long as possible.',
                timer: '90s + bonuses',
                letters: '10',
              },
              {
                name: '🔲 רשת (Grid)',
                desc: 'Fill a grid matrix with words in 4 directions. Tap cell → choose direction → type word. All cells must be white to clear.',
                timer: '90s/stage',
                letters: '10',
              },
              {
                name: '🔷 צורות (Shapes)',
                desc: 'Same as Grid but board is a random shape (heart, star, animal, etc.). 30+ templates + procedural generation.',
                timer: '90s/stage',
                letters: '10',
              },
              {
                name: '🎨 עיצוב שלבים (Level Designer)',
                desc: 'Create custom grid levels, set timer/points, save as packs, share with others.',
                timer: 'Custom',
                letters: 'Custom',
              },
            ].map((mode) => (
              <div key={mode.name} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                <h4 className="text-white font-bold text-lg mb-1">{mode.name}</h4>
                <p className="text-gray-400 text-sm mb-2">{mode.desc}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-purple-400">Timer: {mode.timer}</span>
                  <span className="text-purple-400">Letters: {mode.letters}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <footer className="pt-8 pb-12 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-sm">
            Built with Claude Code · Next.js 14 · Deployed on Vercel
          </p>
          <p className="text-gray-700 text-xs mt-1">
            Repo: github.com/idluxman-gif/fitword · Domain: fitword.vercel.app
          </p>
        </footer>
      </main>
    </div>
  )
}

// ─── Components ───

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-800">{title}</h2>
      {children}
    </section>
  )
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{title}</span>
      <p className="text-white font-medium mt-1">{value}</p>
    </div>
  )
}

function StatusItem({ status, text }: { status: 'done' | 'todo' | 'bug'; text: string }) {
  const icons = { done: '✅', todo: '⬜', bug: '🐛' }
  const colors = { done: 'text-gray-300', todo: 'text-gray-400', bug: 'text-yellow-300' }
  return (
    <div className={`flex gap-2 text-sm ${colors[status]}`}>
      <span className="shrink-0">{icons[status]}</span>
      <span>{text}</span>
    </div>
  )
}

function VersionEntry({ version, date, changes }: { version: string; date: string; changes: string[] }) {
  return (
    <div className="pl-4 border-l-2 border-purple-600/50">
      <h3 className="text-white font-bold">{version}</h3>
      <span className="text-xs text-gray-500">{date}</span>
      <ul className="mt-2 space-y-1">
        {changes.map((c, i) => (
          <li key={i} className="text-sm text-gray-400 flex gap-2">
            <span className="text-purple-400 shrink-0">•</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LogEntry({ date, title, content }: { date: string; title: string; content: string }) {
  return (
    <div className="p-5 rounded-xl bg-gray-900/50 border border-gray-800">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded font-mono">{date}</span>
        <h3 className="text-white font-bold">{title}</h3>
      </div>
      <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: content
            .trim()
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/- (.*)/g, '<span class="flex gap-2 ml-2"><span class="text-purple-400">▸</span><span>$1</span></span>')
        }}
      />
    </div>
  )
}
