"use client";

import Link from "next/link";

type WorkspaceToolAction = {
  id: string;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
};

function ToolIcon({ id }: { id: string }) {
  if (id === "search") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.1 4.1" />
      </svg>
    );
  }

  if (id === "fullscreen") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V4h5" />
        <path d="M20 9V4h-5" />
        <path d="M4 15v5h5" />
        <path d="M20 15v5h-5" />
      </svg>
    );
  }

  if (id === "exitFullscreen") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4v5H4" />
        <path d="M15 4v5h5" />
        <path d="M9 20v-5H4" />
        <path d="M15 20v-5h5" />
      </svg>
    );
  }

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
  utilityActions = [],
}: {
  actions: WorkspaceToolAction[];
  utilityActions?: WorkspaceToolAction[];
}) {
  const renderActionButton = (action: WorkspaceToolAction) => (
    <button
      key={action.id}
      onClick={action.onClick}
      disabled={action.disabled}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-[10px] border transition-all ${
        action.active
          ? "border-[#9297a0] bg-[#eef1ef] text-[var(--accent)]"
          : "border-transparent bg-transparent text-[var(--ink-soft)] hover:border-[#dddddd] hover:bg-[#fbfbfa] hover:text-[var(--ink)]"
      } ${action.disabled ? "cursor-not-allowed opacity-40" : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"}`}
      aria-label={action.label}
    >
      <ToolIcon id={action.id} />
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 rounded-[7px] border border-[#9297a0] bg-[#fbfbfa] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[0_8px_18px_rgba(24,29,38,0.12)] group-hover:block">
        {action.title}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href="/"
        className="group relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dddddd] bg-[#fbfbfa] text-[var(--ink-soft)] shadow-[0_1px_2px_rgba(24,29,38,0.04)] transition-all hover:border-[#9297a0] hover:bg-[#fbfbfa] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
        aria-label="返回首页"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 4.5L6 10l5.5 5.5" />
          <path d="M6.5 10H15" />
        </svg>
        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 rounded-[7px] border border-[#9297a0] bg-[#fbfbfa] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[0_8px_18px_rgba(24,29,38,0.12)] group-hover:block">
          返回首页
        </span>
      </Link>

      {utilityActions.length > 0 && (
        <div className="relative z-20 overflow-visible rounded-[10px] border border-[#dddddd] bg-[#fbfbfa] p-1 shadow-[0_1px_2px_rgba(24,29,38,0.035)]">
          <div className="flex flex-col gap-1">
            {utilityActions.map(renderActionButton)}
          </div>
        </div>
      )}

      <div className="relative z-20 overflow-visible rounded-[10px] border border-[#dddddd] bg-[#fbfbfa] p-1 shadow-[0_1px_2px_rgba(24,29,38,0.035)]">
        <div className="flex flex-col gap-1">
          {actions.map(renderActionButton)}
        </div>
      </div>
    </div>
  );
}
