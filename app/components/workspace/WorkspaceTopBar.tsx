"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceTabs, type WorkspaceTabItem } from "./WorkspaceTabs";

export function WorkspaceTopBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onCloseAllTabs,
}: {
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseAllTabs: () => void;
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
    <div className="border-b border-[rgba(59,63,60,0.08)] bg-[linear-gradient(180deg,rgba(243,244,240,0.98)_0%,rgba(248,248,245,0.94)_100%)] px-3 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:px-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <WorkspaceTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onActivate={onActivateTab}
            onClose={onCloseTab}
          />
        </div>

        <div ref={menuRef} className="relative shrink-0 self-start">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-t-[10px] bg-[rgba(246,247,243,0.96)] text-[var(--ink-soft)] transition-all hover:bg-white hover:text-[var(--ink)]"
            aria-label="展开标签页菜单"
            aria-expanded={isMenuOpen}
          >
            <svg className={`h-4 w-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[320px] overflow-hidden rounded-[18px] border border-[rgba(59,63,60,0.11)] bg-[rgba(252,252,250,0.98)] shadow-[0_18px_38px_rgba(24,28,26,0.14)] backdrop-blur-xl">
              <div className="border-b border-[rgba(59,63,60,0.08)] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                  已打开标签页
                </p>
                <p className="mt-2 text-[15px] font-medium text-[var(--ink)]">
                  当前共有 {tabs.length} 本书
                </p>
              </div>

              <div className="max-h-[280px] overflow-y-auto px-2 py-2">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;

                  return (
                    <div
                      key={tab.id}
                      className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 transition-all ${
                        isActive
                          ? "bg-[rgba(236,240,234,0.96)]"
                          : "hover:bg-[rgba(244,245,241,0.92)]"
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
                          className="shrink-0 rounded-[8px] p-1.5 text-[var(--ink-faint)] transition-all hover:bg-[rgba(59,63,60,0.08)] hover:text-[var(--ink)]"
                          aria-label={`关闭 ${tab.title}`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M5 5L15 15M15 5L5 15" />
                          </svg>
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[rgba(59,63,60,0.05)] px-2 py-1 text-[10px] font-medium text-[var(--ink-faint)]">
                          当前
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[rgba(59,63,60,0.08)] px-3 py-3">
                <button
                  onClick={() => {
                    onCloseAllTabs();
                    setIsMenuOpen(false);
                  }}
                  disabled={closableTabs.length === 0}
                  className="w-full rounded-[12px] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--ink)] transition-all hover:bg-[rgba(59,63,60,0.06)] disabled:cursor-not-allowed disabled:opacity-45"
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
