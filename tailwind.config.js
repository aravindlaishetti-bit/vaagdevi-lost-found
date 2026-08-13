/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bfd4ff",
          300: "#94b8ff",
          400: "#5b7fe0",
          500: "#3a5cc9",
          600: "#2c47a3",
          700: "#22367d",
          800: "#1b2b63",
          900: "#141f4d",
        },
        ember: "#e0793a",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};