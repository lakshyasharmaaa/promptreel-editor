/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        panel: '#1a1a1a',
        accent: '#6c63ff',
        track: {
          video: '#2d4a7a',
          audio: '#2d6b4a',
          text: '#6b2d4a',
          effects: '#6b5a2d'
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        typewriter: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 300ms ease-out both',
        slideUp: 'slideUp 300ms ease-out both',
        zoomIn: 'zoomIn 250ms ease-out both',
        typewriter: 'typewriter 900ms steps(20, end) both'
      }
    },
  },
  plugins: [],
}
