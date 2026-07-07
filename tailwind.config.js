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
        // Polestar Color System
        'bg-page': '#F2F2F0',
        'bg-card': '#FFFFFF',
        'bg-dark': '#1A1A1A',
        'accent-lime': '#C4FF00',
        'accent-dark': '#1A1A1A',
        'text-heading': '#1A1A1A',
        'text-body': '#4A4A4A',
        'text-muted': '#767676',
        'text-on-dark': '#FFFFFF',
        'text-on-dark-muted': 'rgba(255,255,255,0.65)',
        'border-light': '#E0E0DC',
        'color-danger': '#D64545',
        'color-success': '#2E7D5B',
        'color-warning': '#B7791F',
        // Backward compatibility
        carbon: '#FFFFFF',
        dark: '#1A1A1A',
        'dark-secondary': '#1A1A1A',
      },
    },
  },
  plugins: [],
}
