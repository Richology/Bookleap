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
    <section className="px-0 py-1.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
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

      <div className="mt-2 space-y-1 border-t border-[#dddddd] pt-2">
        {children}
      </div>
    </section>
  );
}
