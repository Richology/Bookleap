"use client";

import type { ReactNode } from "react";

function GrowthToggleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.95" />
      <rect x="11.1" y="4.8" width="4.1" height="10.4" rx="2" fill="currentColor" fillOpacity="0.18" />
      <path d="M10 4.7V15.3" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceGrowthSidebar({
  isCollapsed,
  onToggle,
  children,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (isCollapsed) {
    return <aside className="order-3 hidden xl:order-none xl:block" aria-hidden="true" />;
  }

  return (
    <aside className="order-3 min-w-0 xl:pointer-events-auto xl:order-none xl:h-full xl:min-h-0">
      <div className="relative rounded-[18px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] p-2 shadow-none xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:rounded-[12px] xl:shadow-[-10px_0_28px_rgba(24,29,38,0.10)]">
        <div className="mb-2 grid min-h-10 grid-cols-[40px_minmax(0,1fr)_40px] items-center px-1 pb-1.5">
          <div aria-hidden="true" />
          <div className="min-w-0 text-center">
            <p className="font-sans text-[0.95rem] font-semibold tracking-[0] text-[var(--ink)]">
              跃迁
            </p>
          </div>

          <button
            onClick={onToggle}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[9px] border border-transparent bg-transparent text-[#5b5f66] transition-all hover:bg-[#e7ebed] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label={isCollapsed ? "展开成长区" : "收起成长区"}
            title="收起成长区 · ]"
          >
            <GrowthToggleIcon />
          </button>
        </div>

        <div className="no-scrollbar space-y-1.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          {children}
        </div>
      </div>
    </aside>
  );
}
