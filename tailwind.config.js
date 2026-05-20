/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B00', dark: '#cc5500' },
        dark:    { DEFAULT: '#0f0f0f', card: '#1a1a1a', border: '#2a2a2a' }
      },
      fontFamily: { sans: ['Poppins', 'sans-serif'] }
    }
  },
  plugins: []
}
