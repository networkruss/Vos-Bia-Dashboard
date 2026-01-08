/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // This enables dark mode toggling via the 'class' strategy
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
