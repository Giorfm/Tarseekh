/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAF7F0',
          primary: '#1F5F4A',
          gold: '#C9A227',
          charcoal: '#1E2421',
          'dark-bg': '#121816',
          'dark-surface': '#1B2420',
          'dark-primary': '#5DB899',
        },
      },
      fontFamily: {
        quran: ['var(--font-amiri-quran)', 'serif'],
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      lineHeight: {
        quran: '2.2',
      },
    },
  },
  plugins: [],
};
