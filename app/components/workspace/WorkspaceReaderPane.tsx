"use client";

import type { ReactNode } from "react";

export function WorkspaceReaderPane({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="order-1 min-w-0 xl:order-none">
      <div className="overflow-hidden rounded-[16px] border border-[rgba(59,63,60,0.11)] bg-[linear-gradient(180deg,rgba(250,250,248,0.98)_0%,rgba(246,246,243,0.98)_100%)] shadow-[0_14px_34px_rgba(33,37,35,0.055)]">
        {children}
      </div>
    </section>
  );
}
