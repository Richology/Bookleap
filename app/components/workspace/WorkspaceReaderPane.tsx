"use client";

import type { ReactNode, RefObject } from "react";

export function WorkspaceReaderPane({
  topBar,
  scrollContainerRef,
  children,
}: {
  topBar?: ReactNode;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <section className="order-1 min-w-0 xl:order-none xl:h-full xl:min-h-0">
      <div className="overflow-hidden rounded-[12px] border border-[#dddddd] bg-[#fbfbfa] shadow-[0_1px_2px_rgba(24,29,38,0.04)] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
        {topBar}
        <div ref={scrollContainerRef} className="no-scrollbar xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
          {children}
        </div>
      </div>
    </section>
  );
}
