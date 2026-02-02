/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colors dari App.css
        'pink': '#ff00ff',
        'cyan': '#00ffff',
        'yellow': '#feff00',
        'red': '#fc0000',
        'red-bright': '#ff0000',
        'green': '#00ff00',
        'blue': '#00aaff',
        'dark-orange': 'darkorange',
        'gray-soft': '#999999',
        'gray-transparent': '#80808080',
        'white-transparent': '#ffffffad',
        'white-transparent-light': '#ffffffb8',
        'white-transparent-medium': '#8080807a',
        'blue-dark': 'rgb(0 0 254)',
        'black-dark': '#070707',
        'yellow-gold': '#ffe72f',
      },
      fontFamily: {
        'bebas': ['Bebas', 'sans-serif'],
        'carteone': ['carteone', 'sans-serif'],
        'digital': ['FONT0', 'monospace'],
        'arial': ['FONT1', 'sans-serif'],
        'bebas-alt': ['FONT2', 'sans-serif'],
        'din-black': ['FONT3', 'sans-serif'],
        'din-bold': ['FONT4', 'sans-serif'],
        'din-medium': ['FONT5', 'sans-serif'],
      },
      textShadow: {
        'black': '3px 3px 0px rgba(0,0,0,1)',
        'red': '0 0 10px rgba(255, 0, 0, 0.7)',
        'cyan': '4px 4px 0px rgba(0,0,0,1)',
        'white': '-1px 0 20px black, 0 1px 13px black, 1px 0 13px black, 0 -1px 13px black',
      },
      backgroundImage: {
        'mta': "url('./images/bg.jpg')",
        'picture2': "url('./images/picture2.jpg')",
        'azan': "url('./images/azan1.png')",
        'iqamah': "url('./images/iqamah1.png')",
        'rapat': "url('./images/rapat.png')",
      },
      animation: {
        'blink': 'blink 1.5s linear infinite',
        'blink-show': 'blink-show 1s steps(2, jump-none) infinite',
        'blink-fast': 'blink 0.5s linear infinite',
        'blink-slow': 'blink 2s linear infinite',
      },
      keyframes: {
        blink: {
          '0%': { opacity: '0', visibility: 'hidden' },
          '50%': { opacity: '1', visibility: 'visible' },
          '100%': { opacity: '0', visibility: 'hidden' },
        },
        'blink-show': {
          '0%': { opacity: '0', visibility: 'hidden' },
          '100%': { opacity: '1', visibility: 'visible' },
        },
      },
    },
  },
  plugins: [],
}
