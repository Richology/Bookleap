"use client";

import type { ReactNode } from "react";

function LibraryToggleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.4" y="4" width="13.2" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.1 7.3v5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceLibrarySidebar({
  isCollapsed,
  isPreview,
  onToggle,
  onPreviewClose,
  children,
}: {
  isCollapsed: boolean;
  isPreview?: boolean;
  onToggle: () => void;
  onPreviewClose?: () => void;
  children: ReactNode;
}) {
  if (isCollapsed) {
    return <aside className="order-2 hidden xl:order-none xl:block" aria-hidden="true" />;
  }

  return (
    <aside
      className="order-2 min-w-0 xl:pointer-events-auto xl:order-none xl:h-full xl:min-h-0"
      onMouseLeave={isPreview ? onPreviewClose : undefined}
      data-workspace-preview-panel="library"
    >
      <div className="workspace-drawer-in-left relative rounded-[18px] border border-[rgba(24,29,38,0.08)] bg-[#f7f8f9] p-2 shadow-none xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:rounded-[12px] xl:shadow-[10px_0_28px_rgba(24,29,38,0.10)]">
        <div className="mb-2 grid min-h-10 grid-cols-[40px_minmax(0,1fr)_40px] items-center px-1 pb-1.5">
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-transparent bg-transparent text-[#5b5f66] transition-all hover:bg-[#e7ebed] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label={isCollapsed ? "展开书库栏" : "收起书库栏"}
            title="收起书库栏 · ["
          >
            <LibraryToggleIcon />
          </button>

          <div className="min-w-0 text-center">
            <p className="font-sans text-[0.95rem] font-semibold tracking-[0] text-[var(--ink)]">
              书库
            </p>
          </div>
          <div aria-hidden="true" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </aside>
  );
}
