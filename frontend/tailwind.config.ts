import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-open-sans)", 
          "ui-sans-serif", 
          "system-ui", 
          "sans-serif", 
          "Apple Color Emoji", 
          "Segoe UI Emoji", 
          "Segoe UI Symbol", 
          "Noto Color Emoji"
        ],
        playwrite: ['"Playwrite BE VLG"', 'cursive'],
        herr: ['"Herr Von Muellerhoff"', 'cursive'],
      },
    },
  },
  plugins: [],
};

export default config;