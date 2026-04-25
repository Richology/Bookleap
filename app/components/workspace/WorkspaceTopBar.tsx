"use client";

import Link from "next/link";
import { WorkspaceTabs, type WorkspaceTabItem } from "./WorkspaceTabs";

export function WorkspaceTopBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
}: {
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}) {
  return (
    <nav className="border-b border-[rgba(51,56,53,0.12)] bg-[rgba(236,238,233,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1760px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2 md:px-5 xl:px-6">
        <Link
          href="/"
          className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-[rgba(59,63,60,0.09)] bg-[rgba(255,255,255,0.76)] px-3.5 text-sm font-medium text-[var(--ink-soft)] shadow-[0_1px_2px_rgba(36,39,37,0.03)] transition-all hover:border-[rgba(59,63,60,0.14)] hover:bg-white hover:text-[var(--ink)]"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 4.5L6 10l5.5 5.5" />
            <path d="M6.5 10H15" />
          </svg>
          返回首页
        </Link>

        <div className="min-w-0 overflow-hidden rounded-[12px] border border-[rgba(59,63,60,0.08)] bg-[rgba(247,247,244,0.52)] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <WorkspaceTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onActivate={onActivateTab}
            onClose={onCloseTab}
          />
        </div>
      </div>
    </nav>
  );
}
