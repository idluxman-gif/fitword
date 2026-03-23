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
        accent: '#7C3AED',
        tile: '#1E1B3A',
        builder: '#1A1A2E',
        success: '#22C55E',
        error: '#EF4444',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
