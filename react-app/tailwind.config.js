/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        m3: {
          primary: 'rgb(var(--m3-sys-color-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--m3-sys-color-on-primary) / <alpha-value>)',
          'primary-container': 'rgb(var(--m3-sys-color-primary-container) / <alpha-value>)',
          'on-primary-container': 'rgb(var(--m3-sys-color-on-primary-container) / <alpha-value>)',
          surface: 'rgb(var(--m3-sys-color-surface) / <alpha-value>)',
          'surface-container': 'rgb(var(--m3-sys-color-surface-container) / <alpha-value>)',
          'surface-container-high': 'rgb(var(--m3-sys-color-surface-container-high) / <alpha-value>)',
          'on-surface': 'rgb(var(--m3-sys-color-on-surface) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--m3-sys-color-on-surface-variant) / <alpha-value>)',
          outline: 'rgb(var(--m3-sys-color-outline) / <alpha-value>)',
          'outline-variant': 'rgb(var(--m3-sys-color-outline-variant) / <alpha-value>)',
          error: 'rgb(var(--m3-sys-color-error) / <alpha-value>)',
          'error-container': 'rgb(var(--m3-sys-color-error-container) / <alpha-value>)',
          success: 'rgb(var(--app-color-success) / <alpha-value>)',
          warning: 'rgb(var(--app-color-warning) / <alpha-value>)',
        },
      },
      borderRadius: {
        m3xs: 'var(--m3-sys-shape-corner-extra-small)',
        m3sm: 'var(--m3-sys-shape-corner-small)',
        m3md: 'var(--m3-sys-shape-corner-medium)',
        m3lg: 'var(--m3-sys-shape-corner-large)',
        m3xl: 'var(--m3-sys-shape-corner-extra-large)',
        m3full: 'var(--m3-sys-shape-corner-full)',
      },
      boxShadow: {
        m3level1: 'var(--m3-sys-elevation-level1)',
        m3level2: 'var(--m3-sys-elevation-level2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
