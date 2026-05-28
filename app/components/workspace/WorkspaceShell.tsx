"use client";

import type { CSSProperties, ReactNode } from "react";

export function WorkspaceShell({
  toolRail,
  librarySidebar,
  readerPane,
  growthSidebar,
  isLibraryCollapsed,
  isGrowthCollapsed,
}: {
  toolRail: ReactNode;
  librarySidebar: ReactNode;
  readerPane: ReactNode;
  growthSidebar: ReactNode;
  isLibraryCollapsed: boolean;
  isGrowthCollapsed: boolean;
}) {
  const shellStyle = {
    "--workspace-library-width": "286px",
    "--workspace-growth-width": "294px",
    "--workspace-reader-inset-left": isLibraryCollapsed
      ? "0px"
      : "calc(var(--workspace-library-width) + 24px)",
    "--workspace-reader-inset-right": isGrowthCollapsed
      ? "0px"
      : "calc(var(--workspace-growth-width) + 24px)",
  } as CSSProperties;

  return (
    <main className="workspace-theme relative min-h-screen overflow-x-clip bg-[var(--workspace-canvas)] text-[var(--ink)] xl:h-screen xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#dfe4e8]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[140px] bg-[linear-gradient(180deg,rgba(251,252,253,0.76)_0%,rgba(251,252,253,0)_100%)]" />
      <div className="pointer-events-none absolute left-[-80px] top-24 h-[240px] w-[240px] rounded-full bg-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-transparent blur-3xl" />

      <div className="mx-auto max-w-[1760px] px-3 pb-10 pt-3 md:px-5 md:pt-4 xl:flex xl:h-full xl:min-h-0 xl:box-border xl:flex-col xl:px-5 xl:pb-3 xl:pt-3" style={shellStyle}>
        <div className="grid grid-cols-1 gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[48px_minmax(0,1fr)] xl:gap-2.5">
          <div className="hidden xl:flex xl:h-full xl:min-h-0 xl:items-stretch xl:justify-center">
            {toolRail}
          </div>
          <div className="relative grid grid-cols-1 gap-3 xl:block xl:h-full xl:min-h-0">
            {readerPane}
            <div className="xl:pointer-events-none xl:absolute xl:inset-y-0 xl:left-0 xl:z-30 xl:w-[var(--workspace-library-width)]">
              {librarySidebar}
            </div>
            <div className="xl:pointer-events-none xl:absolute xl:inset-y-0 xl:right-0 xl:z-30 xl:w-[var(--workspace-growth-width)]">
              {growthSidebar}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
