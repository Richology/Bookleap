"use client";

import type { ReactNode } from "react";

function LibraryToggleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4.8" y="4.8" width="4.1" height="10.4" rx="2" fill="currentColor" fillOpacity="0.12" />
      <path d="M10 4.7V15.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  const collapsedItems = [
    {
      label: "上传",
      icon: (
        <>
          <path d="M10 4v7.5" />
          <path d="M6.8 7.2 10 4l3.2 3.2" />
          <path d="M4.8 15h10.4" />
        </>
      ),
    },
    {
      label: "赠送",
      icon: (
        <>
          <path d="M4.8 8.5h10.4v6H4.8z" />
          <path d="M10 8.5v6" />
          <path d="M4.8 10.2h10.4" />
          <path d="M7.1 6.6c0-.9.6-1.5 1.4-1.5.9 0 1.5.7 1.5 1.8v1.6H8.4c-.8 0-1.3-.8-1.3-1.9Z" />
          <path d="M12.9 6.6c0-.9-.6-1.5-1.4-1.5-.9 0-1.5.7-1.5 1.8v1.6h1.6c.8 0 1.3-.8 1.3-1.9Z" />
        </>
      ),
    },
    {
      label: "历史",
      icon: (
        <>
          <path d="M5.3 7.2A5 5 0 1 1 4.9 10" />
          <path d="M5.1 4.9v3h3" />
          <path d="M10 7.4v2.9l2 1.2" />
        </>
      ),
    },
  ];

  return (
    <aside className="order-2 min-w-0 xl:order-none xl:sticky xl:top-[88px] xl:self-start">
      <div className="relative rounded-[18px] border border-[rgba(59,63,60,0.11)] bg-[linear-gradient(180deg,rgba(239,240,235,0.98)_0%,rgba(232,234,228,0.98)_100%)] p-3 shadow-[0_8px_22px_rgba(33,37,35,0.04)]">
        <div className="absolute inset-x-4 top-0 h-px bg-[rgba(255,255,255,0.7)]" />
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-[rgba(59,63,60,0.08)] pb-3">
          {!isCollapsed && (
            <div>
              <p className="font-editorial text-[1.22rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">
                书库
              </p>
            </div>
          )}

          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(59,63,60,0.09)] bg-[rgba(255,255,255,0.78)] text-[var(--ink-soft)] transition-all hover:border-[rgba(59,63,60,0.12)] hover:bg-white hover:text-[var(--ink)]"
            aria-label={isCollapsed ? "展开书库栏" : "收起书库栏"}
          >
            <LibraryToggleIcon />
          </button>
        </div>

        {isCollapsed ? (
          <div className="space-y-1.5">
            {collapsedItems.map((item) => (
              <div
                key={item.label}
                title={item.label}
                className="flex h-10 items-center justify-center rounded-[10px] border border-[rgba(59,63,60,0.09)] bg-[rgba(255,255,255,0.78)] text-[var(--ink-soft)]"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </div>
            ))}
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
