module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7fb",
          100: "#e8eef6",
          500: "#1e3a5f",
          600: "#172e4c",
          700: "#112339",
        },
        accent: {
          500: "#b8860b",
          600: "#9a7209",
        },
      },
    },
  },
  plugins: [],
};
