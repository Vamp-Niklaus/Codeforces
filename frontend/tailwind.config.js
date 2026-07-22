/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#05080f",
          900: "#0a0f1d",
          800: "#121a2e",
          700: "#1b2744",
          600: "#273860",
        },
      },
    },
  },
  plugins: [],
}
