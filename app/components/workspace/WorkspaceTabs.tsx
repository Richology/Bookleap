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
      <div className="flex h-11 items-center px-3 text-sm text-[var(--ink-faint)]">
        暂无打开书籍
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-end gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`group relative flex min-w-[180px] max-w-[320px] shrink-0 items-stretch ${
              isActive ? "-mb-px after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-[rgba(250,250,248,0.99)] after:content-['']" : ""
            }`}
          >
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 transition-all ${
                isActive
                  ? "rounded-t-[12px] border-b-[rgba(250,250,248,0.98)] bg-[rgba(250,250,248,0.99)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
                  : "rounded-t-[12px] bg-[rgba(243,244,240,0.78)] hover:bg-[rgba(247,247,244,0.94)]"
              }`}
            >
              <button
                onClick={() => onActivate(tab.id)}
                className="min-w-0 flex-1 px-4 py-[0.82rem] text-left"
              >
                <p className={`truncate text-[13px] font-medium ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                  {tab.title}
                </p>
              </button>

              {tab.closable && (
                <button
                  onClick={() => onClose(tab.id)}
                  className={`mr-2 shrink-0 rounded-[7px] p-1 text-[var(--ink-faint)] transition-all ${
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
          </div>
        );
      })}
    </div>
  );
}
