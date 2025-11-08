/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#6d28d9',
        },
        secondary: {
          DEFAULT: '#ec4899',
          light: '#f472b6',
          dark: '#be185d',
        },
      },
      gradients: {
        'primary-to-secondary': 'linear-gradient(to right, #8b5cf6, #ec4899)',
      },
    },
  },
  plugins: [],
}
