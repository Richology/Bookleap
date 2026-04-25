"use client";

import type { ReactNode } from "react";

export function WorkspaceGrowthSidebar({
  isCollapsed,
  onToggle,
  children,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="order-3 min-w-0 xl:order-none xl:sticky xl:top-[88px] xl:self-start">
      <div className="relative rounded-[18px] border border-[rgba(59,63,60,0.11)] bg-[linear-gradient(180deg,rgba(239,240,235,0.98)_0%,rgba(232,234,228,0.98)_100%)] px-3 pb-3 pt-2 shadow-[0_8px_22px_rgba(33,37,35,0.04)]">
        <div className="absolute inset-x-4 top-0 h-px bg-[rgba(255,255,255,0.7)]" />
        <div className="mb-2 flex items-start justify-between gap-3 border-b border-[rgba(59,63,60,0.08)] pb-2.5">
          {!isCollapsed && (
            <div>
              <p className="font-editorial text-[1.22rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">
                成长区
              </p>
            </div>
          )}

          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(59,63,60,0.09)] bg-[rgba(255,255,255,0.78)] text-[var(--ink-soft)] transition-all hover:border-[rgba(59,63,60,0.12)] hover:bg-white hover:text-[var(--ink)]"
            aria-label={isCollapsed ? "展开成长区" : "收起成长区"}
          >
            <svg className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 4.5L13 10l-5.5 5.5" />
            </svg>
          </button>
        </div>

        {isCollapsed ? (
          <div className="flex items-center justify-center rounded-[10px] border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.82)] py-3">
            <svg className="h-4.5 w-4.5 text-[var(--ink-soft)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 15.5h11" />
              <path d="M6.5 13V9.5" />
              <path d="M10 13V6.5" />
              <path d="M13.5 13v-4" />
            </svg>
          </div>
        ) : (
          <div className="space-y-2">
            {children}
          </div>
        )}
      </div>
    </aside>
  );
}
