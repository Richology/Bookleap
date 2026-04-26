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
    <div className="grid gap-6 border-b border-[rgba(59,63,60,0.09)] bg-[linear-gradient(180deg,rgba(241,242,237,0.96)_0%,rgba(250,250,247,0.92)_100%)] px-5 py-6 md:grid-cols-[122px_minmax(0,1fr)] md:px-8 md:py-7">
      <div className="hidden md:block">
        {cover}
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(59,63,60,0.08)] bg-[rgba(255,255,255,0.76)] px-3 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
                  {progressLabel}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  阅读工作台
                </span>
              </div>

              <h1 className="font-editorial mt-4 line-clamp-2 text-[2.3rem] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] md:text-[2.9rem]">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-2 text-[15px] font-medium text-[var(--ink-soft)] md:text-lg">
                  {subtitle}
                </p>
              )}
            </div>

            {controls && (
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                {controls}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
