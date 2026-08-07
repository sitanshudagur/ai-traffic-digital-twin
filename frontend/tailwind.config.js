/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tt: {
          bg: '#040404',
          card: '#111111',
          elevated: '#090909',
          border: 'rgba(255,255,255,0.0)',
          text: '#FFFFFF',
          muted: '#B8B8B8',
          accent: '#4E8CFF',
          'accent-glow': '#4E8CFF',
        },
        traffic: {
          free: '#2DD36F',
          moderate: '#FFD43B',
          heavy: '#FF922B',
          severe: '#FF4D4F',
        },
        emergency: '#FF4D4F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(0,0,0,0.35)',
        'glow-sm': '0 20px 60px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
