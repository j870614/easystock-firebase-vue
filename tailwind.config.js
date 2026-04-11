/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        'base': '18px',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      minHeight: {
        'touch': '56px',
      },
      colors: {
        stock: {
          in: '#16a34a',    // 入庫綠
          out: '#dc2626',   // 出庫紅
          bg: '#f8fafc',    // 護眼背景
        },
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        }
      },
    },
  },
  plugins: [],
}
