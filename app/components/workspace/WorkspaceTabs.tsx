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
              isActive ? "-mb-px after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-[#fbfcfd] after:content-['']" : ""
            }`}
          >
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 transition-all ${
                isActive
                  ? "rounded-t-[10px] border border-[#dfe4e8] border-b-[#fbfcfd] bg-[#fbfcfd]"
                  : "rounded-t-[10px] border border-transparent bg-transparent hover:border-[#dfe4e8] hover:border-b-transparent hover:bg-[#fbfcfd]"
              }`}
            >
              <button
                onClick={() => onActivate(tab.id)}
                className="min-w-0 flex-1 px-4 py-[0.82rem] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9297a0]"
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
                  } hover:bg-[#edf0f2] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]`}
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
