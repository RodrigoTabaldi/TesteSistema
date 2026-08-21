import { useState, type ReactNode } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
              active === t.id
                ? "bg-blue text-white shadow-[0_4px_12px_-4px_var(--blue)]"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div key={active} className="kx-reveal">
        {current.content}
      </div>
    </div>
  );
}
