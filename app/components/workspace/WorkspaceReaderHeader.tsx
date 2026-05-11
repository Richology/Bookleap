"use client";

import type { ReactNode } from "react";

export function WorkspaceReaderHeader({
  title,
  subtitle,
  progressLabel,
  controls,
  cover,
}: {
  title: string;
  subtitle?: string;
  progressLabel: string;
  controls?: ReactNode;
  cover?: ReactNode;
}) {
  return (
    <div className="grid gap-5 border-b border-[#dddddd] bg-[#fbfbfa] px-5 py-4 md:grid-cols-[96px_minmax(0,1fr)] md:px-6">
      <div className="hidden md:block">
        {cover}
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-4 md:gap-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#dddddd] bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
                  {progressLabel}
                </span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                  阅读工作台
                </span>
              </div>

              <h1 className="mt-3 line-clamp-2 text-[1.95rem] font-semibold leading-[1.08] tracking-[0] text-[var(--ink)] md:text-[2.35rem]">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-1.5 text-[13px] font-medium text-[var(--ink-soft)] md:text-[14px]">
                  {subtitle}
                </p>
              )}
            </div>

            {controls && (
              <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:justify-end">
                {controls}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
