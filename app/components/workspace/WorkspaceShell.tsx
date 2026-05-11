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
    "--workspace-library-width": isLibraryCollapsed ? "0px" : "286px",
    "--workspace-growth-width": isGrowthCollapsed ? "0px" : "294px",
  } as CSSProperties;

  return (
    <main className="workspace-theme relative min-h-screen overflow-x-clip bg-[var(--workspace-canvas)] text-[var(--ink)] xl:h-screen xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#dddddd]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[140px] bg-[linear-gradient(180deg,rgba(251,251,250,0.76)_0%,rgba(251,251,250,0)_100%)]" />
      <div className="pointer-events-none absolute left-[-80px] top-24 h-[240px] w-[240px] rounded-full bg-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-transparent blur-3xl" />

      <div className="mx-auto max-w-[1760px] px-3 pb-10 pt-3 md:px-5 md:pt-4 xl:flex xl:h-full xl:min-h-0 xl:box-border xl:flex-col xl:px-5 xl:pb-3 xl:pt-3" style={shellStyle}>
        <div className="grid grid-cols-1 gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[48px_var(--workspace-library-width)_minmax(0,1fr)_var(--workspace-growth-width)] xl:gap-2.5">
          <div className="hidden xl:flex xl:h-full xl:min-h-0 xl:items-start xl:justify-center">
            {toolRail}
          </div>
          {librarySidebar}
          {readerPane}
          {growthSidebar}
        </div>
      </div>
    </main>
  );
}
