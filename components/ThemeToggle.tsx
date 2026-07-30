import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kronos:theme") as "dark" | "light" | null;
    const initial = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("kronos:theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-fg-muted transition hover:border-[color:var(--ring)] hover:text-fg"
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
