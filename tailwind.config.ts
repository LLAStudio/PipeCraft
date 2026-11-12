import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      colors: {
        // Neutral scale is deliberately green-cast so the dark shell feels
        // like part of the lime palette instead of generic slate.
        gray: {
          50: "#F7F9F2",
          100: "#EDF1E6",
          200: "#DDE4D6",
          300: "#C3CCB9",
          400: "#9AA48D",
          500: "#8A957D",
          600: "#616B55",
          700: "#4A5240",
          800: "#343A2C",
          900: "#22271B",
          950: "#12150E",
        },
        zinc: {
          950: "#0B0D08",
          900: "#131610",
          800: "#2A3022",
          700: "#48513B",
        },
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
