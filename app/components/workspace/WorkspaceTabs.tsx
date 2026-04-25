"use client";

export type WorkspaceTabItem = {
  id: string;
  title: string;
  subtitle?: string;
  closable?: boolean;
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
      <div className="flex h-10 items-center px-2 text-sm text-[var(--ink-faint)]">
        暂无打开书籍
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`group flex min-w-[180px] max-w-[280px] items-center gap-2 rounded-[9px] border px-2.5 py-1.5 transition-all ${
              isActive
                ? "border-[rgba(59,63,60,0.14)] bg-[rgba(255,255,255,0.96)] shadow-[inset_0_1px_0_rgba(58,111,82,0.18),0_1px_2px_rgba(36,39,37,0.05)]"
                : "border-transparent bg-transparent hover:border-[rgba(59,63,60,0.09)] hover:bg-[rgba(255,255,255,0.66)]"
            }`}
          >
            <button
              onClick={() => onActivate(tab.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className={`truncate text-[13px] font-medium ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                {tab.title}
              </p>
              {tab.subtitle && (
                <p className="mt-0.5 truncate text-[10px] tracking-[0.02em] text-[var(--ink-faint)]">
                  {tab.subtitle}
                </p>
              )}
            </button>

            {tab.closable && (
              <button
                onClick={() => onClose(tab.id)}
                className={`shrink-0 rounded-[7px] p-1 text-[var(--ink-faint)] transition-all ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } hover:bg-[rgba(59,63,60,0.08)] hover:text-[var(--ink)]`}
                aria-label={`关闭 ${tab.title}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 5L15 15M15 5L5 15" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
