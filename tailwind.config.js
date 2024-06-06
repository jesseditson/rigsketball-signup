/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.liquid", "./layout/*.liquid"],
  theme: {
    extend: {
      colors: {
        blue: "rgb(102, 107, 244)",
        yellow: "#f8ef4f",
        red: "#f74545",
      },
      fontFamily: {
        sans: ["franklin-gothic-atf", "sans-serif"],
      },
    },
  },
  plugins: [],
};
