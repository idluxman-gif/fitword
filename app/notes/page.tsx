import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FitWord — Project Notes',
  description: 'Sprint 1 build summary for FitWord Hebrew word game',
}

export default function NotesPage() {
  return (
    <div className="min-h-dvh bg-bg text-gray-200 px-4 py-8 max-w-2xl mx-auto" dir="ltr">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-accent mb-2">FitWord — Project Notes</h1>
        <p className="text-gray-400">Sprint 1 Build Summary · March 23, 2026</p>
        <a href="/" className="inline-block mt-3 text-accent underline hover:text-purple-300">
          ← Play the game
        </a>
      </header>

      {/* Overview */}
      <Section title="Overview">
        <p>
          FitWord is a Hebrew mobile-first word game. The player sees 7 fixed letter tiles and a
          target row of 13–16 character slots. They build words by tapping tiles (no keyboard),
          and each valid word fills into the row RTL. The goal: fill the row exactly
          (Perfect Fit) before a 90-second timer runs out.
        </p>
      </Section>

      {/* Tech Stack */}
      <Section title="Tech Stack">
        <Table rows={[
          ['Framework', 'Next.js 14 (App Router)'],
          ['Styling', 'Tailwind CSS 3'],
          ['Animation', 'Framer Motion'],
          ['State', 'Zustand'],
          ['Deploy', 'Vercel'],
          ['PWA', 'manifest.json + service worker'],
          ['Dictionary', '~300 hardcoded Hebrew words'],
        ]} />
      </Section>

      {/* File Structure */}
      <Section title="File Structure">
        <CodeBlock>{`/app/page.tsx          ← Game screen (start, playing, result)
/app/layout.tsx        ← RTL layout, PWA meta, viewport
/app/notes/page.tsx    ← This page
/lib/dictionary.ts     ← ~300 Hebrew words + isValidWord()
/lib/game.ts           ← Round generation, scoring, solvability
/lib/store.ts          ← Zustand store
/public/manifest.json  ← PWA manifest
/public/sw.js          ← Service worker`}</CodeBlock>
      </Section>

      {/* Game Screens */}
      <Section title="Game Screens">
        <h3 className="text-lg font-semibold text-white mt-4 mb-2">1. Start Screen</h3>
        <ScreenDesc
          desc="Purple 'FitWord' title, Hebrew tagline, single CTA button."
          status="✅ Working"
        />

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">2. Game Screen</h3>
        <ScreenDesc
          desc="Top bar: countdown timer, score, remaining slots. Center: target row (13–16 empty slots filling RTL). Bottom: word builder area with ✕ clear / ✓ submit, and 7 large tappable letter tiles."
          status="✅ Working"
        />

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">3. Feedback States</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li><span className="text-success">✓ מילה מצוינת.</span> — valid word accepted</li>
          <li><span className="text-error">✗ לא במילון.</span> — word not in dictionary</li>
          <li><span className="text-error">✗ ארוך מדי.</span> — word exceeds remaining slots</li>
          <li><span className="text-gray-400">נשארו X מקומות</span> — remaining slots count</li>
        </ul>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">4. Win Screen</h3>
        <ScreenDesc
          desc="🎉 'Perfect Fit!' with burst animation, final score, time remaining bonus, word list. Purple 'שחק שוב!' CTA."
          status="✅ Working"
        />

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">5. Loss Screen</h3>
        <ScreenDesc
          desc="😔 gentle 'נשארו X תווים' message, final score, words played. Purple 'שחק שוב!' CTA."
          status="✅ Working"
        />
      </Section>

      {/* Scoring */}
      <Section title="Scoring System">
        <Table rows={[
          ['Base', '10 points per letter in valid word'],
          ['Bonus (≥4 letters)', '+10 points'],
          ['Bonus (≥6 letters)', '+25 points'],
          ['Perfect Fit', '+100 points'],
          ['Invalid word', '−10 points penalty'],
        ]} />
      </Section>

      {/* Round Generation */}
      <Section title="Round Generation Logic">
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Pick random target length: 13, 14, 15, or 16 characters</li>
          <li>Pick 7 distinct Hebrew letters using weighted random selection (common letters like מ,ל,ש,י,ו,ה,א weighted higher)</li>
          <li>Solvability check: verify ≥2 dictionary words can be formed from the 7 letters</li>
          <li>If check fails, resample up to 10 times</li>
          <li>Fallback to guaranteed safe preset: [מ, ל, ש, ר, ב, ת, א]</li>
        </ol>
        <div className="mt-3 p-3 bg-builder rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Key insight:</strong> Letters are never consumed, so
            formability is a <em>set membership</em> check — every character in the word must
            exist in the 7-letter set. No multiset counting needed.
          </p>
        </div>
      </Section>

      {/* Zustand Store */}
      <Section title="State Management (Zustand)">
        <CodeBlock>{`{
  letters: string[]        // 7 Hebrew letters for this round
  targetLength: number     // 13–16
  filledWords: string[]    // words placed so far
  currentWord: string      // word being built
  score: number
  timeLeft: number         // seconds (countdown from 90)
  status: 'idle' | 'playing' | 'won' | 'lost'
  feedback: { text, type } // one-line messages
}`}</CodeBlock>
      </Section>

      {/* Visual Design */}
      <Section title="Visual Design">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ColorSwatch color="#0F0F1A" label="Background" />
          <ColorSwatch color="#7C3AED" label="Primary Accent" />
          <ColorSwatch color="#1E1B3A" label="Tile Base" />
          <ColorSwatch color="#1A1A2E" label="Builder Area" />
          <ColorSwatch color="#22C55E" label="Success" />
          <ColorSwatch color="#EF4444" label="Error" />
        </div>
        <ul className="list-disc list-inside space-y-1 text-gray-300 mt-4">
          <li>56×56px letter tiles, rounded-xl, elevated shadow</li>
          <li>Framer Motion scale-down on tap (0.92)</li>
          <li>RTL layout throughout (dir=&quot;rtl&quot; on html)</li>
          <li>Designed for 375px viewport (iPhone 14)</li>
          <li>System font stack — no external fonts</li>
        </ul>
      </Section>

      {/* PWA */}
      <Section title="PWA Setup">
        <Table rows={[
          ['name', 'FitWord'],
          ['display', 'standalone'],
          ['orientation', 'portrait'],
          ['theme_color', '#7C3AED'],
          ['background_color', '#0F0F1A'],
          ['Service Worker', 'App shell cache, network-first navigation'],
        ]} />
      </Section>

      {/* Known Issues */}
      <Section title="Known Issues & Next Steps">
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>No app icons yet (icon-192.png, icon-512.png referenced but not created)</li>
          <li>Dictionary is ~300 words — many common Hebrew words missing</li>
          <li>No sound effects or haptic feedback</li>
          <li>No share score functionality</li>
          <li>No tutorial / onboarding</li>
        </ul>
      </Section>

      {/* Links */}
      <Section title="Links">
        <ul className="space-y-2">
          <li>
            <span className="text-gray-400">Live App: </span>
            <a href="https://fitword.vercel.app" className="text-accent underline">
              fitword.vercel.app
            </a>
          </li>
          <li>
            <span className="text-gray-400">GitHub: </span>
            <a href="https://github.com/idluxman-gif/fitword" className="text-accent underline">
              github.com/idluxman-gif/fitword
            </a>
          </li>
          <li>
            <span className="text-gray-400">Vercel Dashboard: </span>
            <a href="https://vercel.com/idols-projects-f51e3e54/fitword" className="text-accent underline">
              vercel.com/idols-projects-f51e3e54/fitword
            </a>
          </li>
        </ul>
      </Section>

      <footer className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-500">
        Built with Claude Code · Sprint 1 · {new Date().toLocaleDateString('en-IL')}
      </footer>
    </div>
  )
}

// ─── Reusable Components ───

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-3 pb-1 border-b border-gray-800">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/30' : ''}>
              <td className="px-3 py-2 font-medium text-gray-300 whitespace-nowrap">{label}</td>
              <td className="px-3 py-2 text-gray-400">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
      <code>{children}</code>
    </pre>
  )
}

function ScreenDesc({ desc, status }: { desc: string; status: string }) {
  return (
    <div className="p-3 bg-builder rounded-lg border border-gray-700">
      <p className="text-gray-300 text-sm">{desc}</p>
      <p className="text-xs mt-1 text-success">{status}</p>
    </div>
  )
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900/30 rounded-lg">
      <div className="w-8 h-8 rounded-md border border-gray-700" style={{ backgroundColor: color }} />
      <div>
        <div className="text-gray-300">{label}</div>
        <div className="text-gray-500 text-xs font-mono">{color}</div>
      </div>
    </div>
  )
}
