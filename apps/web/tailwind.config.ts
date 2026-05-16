import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#BCAA89',
          hover: '#A59475',
          secondary: '#DFDBCF',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
        surface: {
          primary: '#F1EEE5',
          secondary: '#DFDBCF',
          tertiary: '#D5D1C5',
          elevated: '#FFFFFF',
        },
        txt: {
          primary: '#030304',
          secondary: '#4A4A4F',
          muted: '#73737A',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(188, 170, 137, 0.15)',
        'glow-lg': '0 0 40px rgba(188, 170, 137, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-right': 'slideInRight 0.3s ease-out',
        'slide-left': 'slideInLeft 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;