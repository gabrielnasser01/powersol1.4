/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/index.html', './frontend/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Orbitron', 'monospace'],
      },
      colors: {
        neon: {
          blue: '#3ecbff',
          pink: '#ff4ecd', 
          cyan: '#2fffe2',
          purple: '#b347ff',
          orange: '#ff7847',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          from: { textShadow: '0 0 20px #3ecbff, 0 0 30px #3ecbff, 0 0 40px #3ecbff' },
          to: { textShadow: '0 0 10px #3ecbff, 0 0 20px #3ecbff, 0 0 30px #3ecbff' },
        },
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
    },
  },
  plugins: [],
};