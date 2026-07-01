"use client";

import { CloseIcon } from "../icons/AdminIcons";

export type WorkspaceTabItem = {
  id: string;
  title: string;
  subtitle?: string;
  closable?: boolean;
  status?: "analyzing";
  progressLabel?: string;
};

export function WorkspaceTabs({
  tabs,
  activeTabId,
  onActivate,
  onClose,
}: {
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  if (tabs.length === 0) {
    return (
      <div className="flex h-10 items-center px-3 text-sm text-[var(--ink-faint)]">
        暂无打开书籍
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-end gap-2 overflow-x-auto pb-2 no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className="group relative flex h-10 w-[180px] shrink-0 items-stretch"
          >
            <div
              className={`relative flex min-w-0 flex-1 items-center gap-1 rounded-[9px] bg-transparent shadow-none transition-all after:absolute after:inset-x-0 after:bottom-[-8px] after:h-0.5 after:transition-colors hover:bg-[var(--workspace-hover-surface)] hover:shadow-[0_8px_18px_rgba(24,29,38,0.08)] ${
                isActive
                  ? "after:bg-[var(--ink)]"
                  : "after:bg-transparent"
              }`}
            >
              <button
                onClick={() => onActivate(tab.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9297a0]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {tab.status === "analyzing" && (
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-35" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                    </span>
                  )}
                  <span className={`truncate text-[13px] font-semibold ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                    {tab.title}
                  </span>
                  {tab.progressLabel && (
                    <span className="shrink-0 text-[11px] font-medium text-[var(--ink-faint)]">
                      {tab.progressLabel}
                    </span>
                  )}
                </span>
              </button>

              {tab.closable && (
                <button
                  onClick={() => onClose(tab.id)}
                  className={`mr-1.5 shrink-0 rounded-[7px] p-1 text-[var(--ink-faint)] transition-all ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } hover:bg-[#edf0f2] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]`}
                  aria-label={`关闭 ${tab.title}`}
                >
                  <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
