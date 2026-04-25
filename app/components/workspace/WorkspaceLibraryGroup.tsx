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
    <section className="px-1 py-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
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

      <div className="mt-2 space-y-1 border-l border-[rgba(59,63,60,0.1)] pl-3">
        {children}
      </div>
    </section>
  );
}
