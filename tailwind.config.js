/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        outfit: ['Inter', 'sans-serif'],
        poppins: ['Inter', 'sans-serif'],
      },
      colors: {
        carbon: '#FFFFFF',
        dark: '#0D1B2A',
        'dark-secondary': '#16283B',
      },
    },
  },
  plugins: [],
}
