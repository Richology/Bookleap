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

function UploadIcon() {
  return (
    <>
      <path d="M10 5.1v6.1" />
      <path d="M7.6 7.6 10 5.1l2.4 2.5" />
      <path d="M5.2 12.9v1.3c0 .8.6 1.4 1.4 1.4h6.8c.8 0 1.4-.6 1.4-1.4v-1.3" />
    </>
  );
}

function GiftBooksIcon() {
  return (
    <>
      <rect x="4.8" y="5.4" width="2.5" height="8.6" rx="1" />
      <rect x="8.65" y="4.9" width="2.5" height="9.1" rx="1" />
      <rect x="12.5" y="5.8" width="2.1" height="8.2" rx="1" />
      <path d="M4.5 14.4h10.9" />
    </>
  );
}

function HistoryIcon() {
  return (
    <>
      <path d="M5.7 6.6A5 5 0 1 1 5 10.2" />
      <path d="M5.1 4.9v3.2h3.2" />
      <path d="M10 7.4v2.8l1.9 1.2" />
    </>
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
      icon: <UploadIcon />,
    },
    {
      label: "赠送",
      icon: <GiftBooksIcon />,
    },
    {
      label: "历史",
      icon: <HistoryIcon />,
    },
  ];

  return (
    <aside className="order-2 min-w-0 xl:order-none xl:h-full xl:min-h-0">
      <div className="relative rounded-[18px] border border-[rgba(59,63,60,0.11)] bg-[linear-gradient(180deg,rgba(239,240,235,0.98)_0%,rgba(232,234,228,0.98)_100%)] p-3 shadow-[0_8px_22px_rgba(33,37,35,0.04)] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
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
          <div className="no-scrollbar space-y-1.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
            {collapsedItems.map((item) => (
              <button
                key={item.label}
                title={item.label}
                type="button"
                className="flex h-10 w-full items-center justify-center rounded-[11px] border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.82)] text-[var(--ink-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] transition-colors hover:bg-white hover:text-[var(--ink)]"
                aria-label={item.label}
              >
                <svg className="h-[19px] w-[19px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <div className="no-scrollbar space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
            {children}
          </div>
        )}
      </div>
    </aside>
  );
}
