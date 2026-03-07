/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        // ✅ Marquee keyframe dipadamkan — diguna ganti oleh index.css dengan nama marquee-from-right
      },
      animation: {
        blink: 'blink 1s ease-in-out infinite',
        // ✅ Marquee animation dipadamkan — komponen Marquee guna inline style terus
      },
    },
  },
  plugins: [],
};
