/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0b7a5b", deep: "#075e46", soft: "#e7f2ee" },
        gold: { DEFAULT: "#e0952b", deep: "#b9761b", soft: "#fbf1dd" },
        ink: { DEFAULT: "#0e1b17", soft: "#3a4a44" },
        sand: "#f5f7f5",
        line: "#e6ebe8",
        muted: "#5b6b64",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,27,23,0.04), 0 1px 3px rgba(14,27,23,0.05)",
        cardhover: "0 10px 30px -8px rgba(7,94,70,0.22)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
