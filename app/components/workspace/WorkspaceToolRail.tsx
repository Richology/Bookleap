"use client";

type WorkspaceToolAction = {
  id: string;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
};

function ToolIcon({ id }: { id: string }) {
  if (id === "training") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4.5h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 14 15.5H6A1.5 1.5 0 0 1 4.5 14V6A1.5 1.5 0 0 1 6 4.5Z" />
        <path d="M8 8.2h4M8 11.8h2.2" />
      </svg>
    );
  }

  if (id === "export") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3.8v8.4" />
        <path d="M6.8 9l3.2 3.2L13.2 9" />
        <path d="M4.8 14.5h10.4" />
      </svg>
    );
  }

  if (id === "share") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="10" r="1.8" />
        <circle cx="14" cy="5.5" r="1.8" />
        <circle cx="14" cy="14.5" r="1.8" />
        <path d="M7.7 9.1l4.7-2.5M7.7 10.9l4.7 2.5" />
      </svg>
    );
  }

  return <span className="text-xs font-semibold">{id.slice(0, 1)}</span>;
}

export function WorkspaceToolRail({
  actions,
}: {
  actions: WorkspaceToolAction[];
}) {
  return (
    <div className="relative z-20 overflow-visible rounded-[14px] border border-[rgba(52,56,54,0.11)] bg-[linear-gradient(180deg,rgba(238,240,235,0.98)_0%,rgba(232,234,229,0.98)_100%)] p-1 shadow-[0_8px_22px_rgba(33,37,35,0.04)]">
      <div className="absolute inset-x-1.5 top-0 h-px bg-[rgba(255,255,255,0.78)]" />
      <div className="flex flex-col gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-[10px] border transition-all ${
              action.active
                ? "border-[rgba(58,111,82,0.2)] bg-[rgba(225,236,229,0.96)] text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
                : "border-transparent bg-transparent text-[var(--ink-soft)] hover:border-[rgba(59,63,60,0.1)] hover:bg-[rgba(255,255,255,0.82)] hover:text-[var(--ink)]"
            } ${action.disabled ? "cursor-not-allowed opacity-40" : ""}`}
            aria-label={action.label}
          >
            <ToolIcon id={action.id} />
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 rounded-[8px] border border-[rgba(24,27,26,0.18)] bg-[rgba(26,30,28,0.96)] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-[0_8px_18px_rgba(23,25,24,0.18)] group-hover:block">
              {action.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
