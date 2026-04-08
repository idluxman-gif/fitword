/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F1A',
        deep: '#07070F',
        surface: '#16132B',
        accent: '#7C3AED',
        neon: '#A855F7',
        tile: '#1E1B3A',
        builder: '#1A1A2E',
        success: '#22C55E',
        error: '#EF4444',
        gold: '#F59E0B',
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
