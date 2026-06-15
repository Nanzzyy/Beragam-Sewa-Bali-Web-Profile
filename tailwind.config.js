/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./home/**/*.html",
    "./katalog/**/*.html",
    "./admin/**/*.html",
    "./src/**/*.js",
    "./apps/web/public/**/*.html",
    "./apps/web/public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#e63946',
        'brand-red-dark': '#c1121f',
        'brand-red-light': '#ff6b6b',
        'brand-dark': '#1a1a2e',
        'bg-base': '#f7f4f1',
        'bg-surface': '#ffffff',
        'bg-elevated': '#f0ece8',
        'bg-dark': '#1a1a1a',
        'bg-soft': '#f8f9fa',
        'text-primary': '#1a1a2e',
        'text-body': '#444455',
        'text-muted': '#888899',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '20px',
        'xl3': '28px',
      }
    },
  },
  plugins: [],
}
