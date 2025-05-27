/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 0 15px rgba(0, 0, 0, 0.1)',
        'glass-sm': '0 0 10px rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 0 20px rgba(0, 0, 0, 0.1)',
        'glass-xl': '0 0 25px rgba(0, 0, 0, 0.1)',
        'inner-glass': 'inset 0 0 15px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dots': 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dots': '20px 20px',
      },
    },
  },
  plugins: [],
};