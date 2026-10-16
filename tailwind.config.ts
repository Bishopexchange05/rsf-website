import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#143BA2",
        purple: { DEFAULT: "#59329C", panel: "#3A2270" },
        brand: { green: "#3FC890", bright: "#2EEF80" },
        amber: "#FEAE23",
        accent: { red: "#D02020", blue: "#3B60F7" },
        slate: { navy: "#26374A" },
        cream: "#EFF1F0",
        dark: {
          bg: "#0B1230",
          card: "#151C3D",
          text: "#EDEFF5",
          green: "#4FE3A6",
          link: "#7DD8E8",
        },
      },
      fontFamily: {
        heading: ["var(--font-baloo)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(2.25rem, 1.5rem + 3.6vw, 4.25rem)", { lineHeight: "1.1" }],
        h2: ["clamp(1.75rem, 1.35rem + 1.8vw, 2.75rem)", { lineHeight: "1.2" }],
        h3: ["clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)", { lineHeight: "1.25" }],
      },
    },
  },
  plugins: [],
};

export default config;
