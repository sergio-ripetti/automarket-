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
        dark: '#0F172A',
        'dark-secondary': '#1E293B',
        amber: {
          400: '#93C5FD',
          500: '#1D4ED8',
          600: '#1E40AF',
        },
      },
    },
  },
  plugins: [],
}
