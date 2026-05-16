"use client";

import type { ReactNode } from "react";

export function WorkspaceLibraryGroup({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="px-0 py-2">
      <div className="flex items-start justify-between gap-3 px-2.5">
        <div>
          <p className="text-[12px] font-semibold tracking-[0] text-[#6b706d]">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-[11px] leading-5 text-[var(--ink-faint)]">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>

      <div className="mt-1 space-y-0.5">
        {children}
      </div>
    </section>
  );
}
