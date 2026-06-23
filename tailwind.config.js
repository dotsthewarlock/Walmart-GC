/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We will map your Material 3 (M3) design tokens here
        m3: {
          primary: '#0b57d0',
          onPrimary: '#ffffff',
          surface: '#f8fafc',
        }
      }
    },
  },
  plugins: [],
}
