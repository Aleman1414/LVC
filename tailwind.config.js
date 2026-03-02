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
          DEFAULT: '#003366', // Dark Blue
          light: '#004080',
          dark: '#00264d',
        },
        secondary: {
          DEFAULT: '#cc0000', // Red
          light: '#e60000',
          dark: '#b30000',
        },
        accent: {
          DEFAULT: '#f5f5f5', // Light Gray/White
        }
      },
    },
  },
  plugins: [],
}
