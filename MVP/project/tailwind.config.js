/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0D0D0D',
          card: '#141414',
          border: 'rgba(245, 245, 245, 0.1)',
        },
        highlight: {
          DEFAULT: '#4FE7FF',
          hover: '#6ff0ff',
          muted: 'rgba(79, 231, 255, 0.15)',
        },
        success: {
          DEFAULT: '#81FF4D',
          muted: 'rgba(129, 255, 77, 0.15)',
        },
        danger: {
          DEFAULT: '#F51D1D',
          muted: 'rgba(245, 29, 29, 0.15)',
        },
        cream: {
          DEFAULT: '#F5F5F5',
          muted: 'rgba(245, 245, 245, 0.6)',
        },
        gold: {
          DEFAULT: '#c5a572',
          light: '#e0c896',
          dark: '#a08555',
        }
      },
    },
  },
  plugins: [],
};
