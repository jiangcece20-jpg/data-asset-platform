/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2f6bff',
          600: '#2555db',
          700: '#1c42ad'
        }
      },
      boxShadow: {
        card: '0 2px 12px rgba(15, 23, 42, 0.06)'
      }
    }
  },
  plugins: []
}
