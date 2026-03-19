/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:       '#1e3b8a',
        'primary-dark':'#162d6b',
        'primary-light':'#2451b3',
        'bg-light':    '#f6f6f8',
        'bg-dark':     '#0f172a',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
