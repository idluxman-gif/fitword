/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'system-ui', 'sans-serif'],
        sora: ['Sora', 'system-ui', 'sans-serif'],
        bungee: ['Bungee', 'Sora', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Sunset Coral palette
        bg: '#1a0510',
        deep: '#0a020a',
        'bg-mid': '#2e0a1f',
        surface: '#2e0a1f',
        accent: '#fb7185',
        'accent-2': '#fb923c',
        neon: '#fb7185',
        tile: '#1f0814',
        builder: '#1a0510',
        success: '#22c55e',
        error: '#ef4444',
        gold: '#f5b942',
        'gold-1': '#ffe27a',
        'gold-2': '#f5b942',
        'gold-3': '#c47b14',
        'gold-deep': '#7a4500',
        'tile-top': '#fb7185',
        'tile-bot': '#be123c',
        'tile-edge': '#5b0f1f',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      keyframes: {
        timerGlow: {
          '0%, 100%': { textShadow: '0 0 8px rgba(239,68,68,0.7)' },
          '50%': { textShadow: '0 0 24px rgba(239,68,68,1), 0 0 48px rgba(239,68,68,0.5)' },
        },
        scorePop: {
          '0%': { transform: 'scale(1.5)' },
          '60%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'timer-glow': 'timerGlow 0.5s ease-in-out infinite',
        'score-pop': 'scorePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
