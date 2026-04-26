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
    "--workspace-library-width": isLibraryCollapsed ? "88px" : "286px",
    "--workspace-growth-width": isGrowthCollapsed ? "56px" : "294px",
  } as CSSProperties;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#f4f4f1_0%,#f2f3ef_100%)] xl:h-screen xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[rgba(255,255,255,0.7)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[180px] bg-[linear-gradient(180deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute left-[-80px] top-24 h-[240px] w-[240px] rounded-full bg-[rgba(58,111,82,0.06)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-[rgba(85,92,89,0.05)] blur-3xl" />

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
