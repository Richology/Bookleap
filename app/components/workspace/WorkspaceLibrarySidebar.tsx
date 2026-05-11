"use client";

import type { ReactNode } from "react";

function LibraryToggleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.95" />
      <rect x="4.8" y="4.8" width="4.1" height="10.4" rx="2" fill="currentColor" fillOpacity="0.18" />
      <path d="M10 4.7V15.3" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceLibrarySidebar({
  isCollapsed,
  onToggle,
  children,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (isCollapsed) {
    return <aside className="order-2 hidden xl:order-none xl:block" aria-hidden="true" />;
  }

  return (
    <aside className="order-2 min-w-0 xl:order-none xl:h-full xl:min-h-0">
      <div className="relative rounded-[12px] border border-[#dddddd] bg-[#f8fafc] p-3 shadow-[0_1px_2px_rgba(24,29,38,0.04)] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
        <div className="absolute inset-x-4 top-0 h-px bg-[rgba(255,255,255,0.82)]" />
        <div className="relative mb-3 flex min-h-8 items-center justify-center border-b border-[#dddddd] pb-3">
          <button
            onClick={onToggle}
            className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#dddddd] bg-[#fbfbfa] text-[#4f555d] transition-all hover:border-[#9297a0] hover:bg-[#fbfbfa] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label={isCollapsed ? "展开书库栏" : "收起书库栏"}
            title="收起书库栏 · ["
          >
            <LibraryToggleIcon />
          </button>

          <div className="min-w-0 px-10 text-center">
            <p className="font-sans text-[0.95rem] font-semibold tracking-[0] text-[var(--ink)]">
              书库
            </p>
          </div>
        </div>

        <div className="no-scrollbar space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          {children}
        </div>
      </div>
    </aside>
  );
}
