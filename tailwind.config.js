/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: true,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb', // WCAG AA primary on white
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          base: '#f8fafc',
          card: '#ffffff',
          dark: '#0f172a',
          muted: '#64748b'
        },
        danger: {
          light: '#fef2f2',
          base: '#dc2626',
          dark: '#991b1b'
        },
        success: {
          light: '#f0fdf4',
          base: '#16a34a',
          dark: '#166534'
        }
      },
      fontFamily: {
        sans: ['Sarabun', 'Prompt', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

