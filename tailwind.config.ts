import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-dim": "var(--fg-dim)",
        blue: "var(--blue)",
        "blue-lift": "var(--blue-lift)",
        gold: "var(--gold)",
        "gold-soft": "var(--gold-soft)",
        pos: "var(--pos)",
        warn: "var(--warn)",
        crit: "var(--crit)",
      },
      fontFamily: {
        serif: ["var(--serif)"],
        sans: ["var(--sans)"],
      },
      borderRadius: {
        lg: "16px",
        md: "11px",
        sm: "8px",
      },
      boxShadow: {
        kronos: "var(--shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
