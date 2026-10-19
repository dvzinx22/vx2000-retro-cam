/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        osd: ['Consolas', 'Monaco', '"Lucida Console"', 'monospace'],
      },
      colors: {
        cam: {
          dark: '#0c0c0e',
          chassis: '#18181c',
          panel: '#202026',
          border: '#32323c',
          accent: '#ff9900',
          rec: '#ff2222',
          osd: '#39ff14',
          nightshot: '#00ff66',
        }
      }
    },
  },
  plugins: [],
}
