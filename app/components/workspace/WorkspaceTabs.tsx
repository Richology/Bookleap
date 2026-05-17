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
      <div className="flex h-10 items-center px-3 text-sm text-[var(--ink-faint)]">
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
            className="group relative flex h-10 w-[180px] shrink-0 items-stretch"
          >
            <div
              className={`relative flex min-w-0 flex-1 items-center gap-1 rounded-[8px] transition-all ${
                isActive
                  ? "bg-transparent"
                  : "bg-transparent hover:bg-[#edf1f3]"
              }`}
            >
              <button
                onClick={() => onActivate(tab.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9297a0]"
              >
                <p className={`truncate text-[13px] font-semibold ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                  {tab.title}
                </p>
              </button>

              {tab.closable && (
                <button
                  onClick={() => onClose(tab.id)}
                  className={`mr-1.5 shrink-0 rounded-[7px] p-1 text-[var(--ink-faint)] transition-all ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } hover:bg-[#edf0f2] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]`}
                  aria-label={`关闭 ${tab.title}`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M5 5L15 15M15 5L5 15" />
                  </svg>
                </button>
              )}

              {isActive && (
                <span className="absolute bottom-[-5px] left-1/2 h-0.5 w-[72px] -translate-x-1/2 rounded-full bg-[var(--accent)]" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
