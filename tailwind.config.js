/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#f59e0b',
        dark: '#0a0a0a',
        carbon: '#1a1a1a',
        bone: '#f5f5f0',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'cursive'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
