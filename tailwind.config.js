/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B00', dark: '#cc5500' },
        light:   { DEFAULT: '#f8fafc', card: '#ffffff', border: '#e5e7eb' }
      },
      fontFamily: { sans: ['Poppins', 'sans-serif'] }
    }
  },
  plugins: []
}
