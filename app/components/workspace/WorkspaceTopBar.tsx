"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceTabs, type WorkspaceTabItem } from "./WorkspaceTabs";

function SidebarToggleIcon({ side }: { side: "left" | "right" }) {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.95" />
      <rect
        x={side === "left" ? "4.8" : "11.1"}
        y="4.8"
        width="4.1"
        height="10.4"
        rx="2"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path d="M10 4.7V15.3" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceTopBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onCloseAllTabs,
  isLibraryCollapsed,
  onExpandLibrary,
  isGrowthCollapsed,
  onExpandGrowth,
}: {
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseAllTabs: () => void;
  isLibraryCollapsed: boolean;
  onExpandLibrary: () => void;
  isGrowthCollapsed: boolean;
  onExpandGrowth: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closableTabs = useMemo(
    () => tabs.filter((tab) => tab.closable),
    [tabs]
  );

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  return (
    <div className="border-b border-[#dddddd] bg-[#f8fafc] px-2 pt-2 md:px-3">
      <div className="flex items-end justify-between gap-2">
        {isLibraryCollapsed && (
          <button
            type="button"
            onClick={onExpandLibrary}
            className="mb-px flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-transparent text-[#4f555d] transition-all hover:bg-[#fbfbfa] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label="展开书库栏"
            title="展开书库栏 · ["
          >
            <SidebarToggleIcon side="left" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <WorkspaceTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onActivate={onActivateTab}
            onClose={onCloseTab}
          />
        </div>

        <div ref={menuRef} className="relative flex shrink-0 items-start gap-1 self-start">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-transparent text-[var(--ink-soft)] transition-all hover:bg-[#fbfbfa] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label="展开标签页菜单"
            aria-expanded={isMenuOpen}
          >
            <svg className={`h-4 w-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </button>

          {isGrowthCollapsed && (
            <button
              type="button"
              onClick={onExpandGrowth}
              className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-transparent text-[#4f555d] transition-all hover:bg-[#fbfbfa] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
              aria-label="展开成长区"
              title="展开成长区 · ]"
            >
              <SidebarToggleIcon side="right" />
            </button>
          )}

          {isMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[320px] overflow-hidden rounded-[10px] border border-[#9297a0] bg-[#fbfbfa] shadow-[0_10px_26px_rgba(24,29,38,0.12)]">
              <div className="border-b border-[#dddddd] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                  已打开标签页
                </p>
                <p className="mt-1.5 text-[14px] font-medium text-[var(--ink)]">
                  当前共有 {tabs.length} 本书
                </p>
              </div>

              <div className="max-h-[280px] overflow-y-auto px-2 py-2">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;

                  return (
                    <div
                      key={tab.id}
                      className={`flex items-center justify-between gap-3 rounded-[9px] border px-3 py-2.5 transition-all ${
                        isActive
                          ? "border-[#9297a0] bg-[#eef1ef]"
                          : "border-transparent hover:border-[#dddddd] hover:bg-[#f4f5f7]"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onActivateTab(tab.id);
                          setIsMenuOpen(false);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className={`truncate text-[13px] font-medium ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                          {tab.title}
                        </p>
                      </button>

                      {tab.closable ? (
                        <button
                          onClick={() => onCloseTab(tab.id)}
                          className="shrink-0 rounded-[7px] p-1.5 text-[var(--ink-faint)] transition-all hover:bg-[#edf0f2] hover:text-[var(--ink)]"
                          aria-label={`关闭 ${tab.title}`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M5 5L15 15M15 5L5 15" />
                          </svg>
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full border border-[#dddddd] bg-[#fbfbfa] px-2 py-1 text-[10px] font-medium text-[var(--ink-faint)]">
                          当前
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#dddddd] px-3 py-3">
                <button
                  onClick={() => {
                    onCloseAllTabs();
                    setIsMenuOpen(false);
                  }}
                  disabled={closableTabs.length === 0}
                  className="w-full rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--ink)] transition-all hover:bg-[#f4f5f7] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
                >
                  全部关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
