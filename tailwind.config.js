/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        line: '#d7dde6',
        panel: '#f8fafc',
        'brand-blue': '#0B5BA7',
        'brand-blue-dark': '#053C78',
        'brand-blue-soft': '#EAF5FC',
        'brand-orange': '#F4A321',
        'brand-orange-soft': '#FFF3D8'
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
}
