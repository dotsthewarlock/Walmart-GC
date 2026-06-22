/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2f5f9f',
        'on-primary': '#ffffff',
        surface: '#fbf8ff',
        'surface-container': '#efedf4',
        'on-surface': '#1c1b20',
      },
      borderRadius: {
        'm3-card': '1.5rem',
      },
      boxShadow: {
        'm3-elevated': '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
