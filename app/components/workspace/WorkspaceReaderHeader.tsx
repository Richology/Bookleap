"use client";

import type { ReactNode } from "react";

export function WorkspaceReaderHeader({
  title,
  subtitle,
  cover,
  density = "compact",
}: {
  title: string;
  subtitle?: string;
  progressLabel?: string;
  cover?: ReactNode;
  density?: "hero" | "compact";
}) {
  if (density === "hero") {
    return (
      <div className="grid gap-5 border-b border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-5 py-4 md:grid-cols-[96px_minmax(0,1fr)] md:px-6">
        <div className="hidden md:block">
          {cover}
        </div>

        <div className="min-w-0">
          <h1 className="line-clamp-2 text-[1.95rem] font-semibold leading-[1.08] tracking-[0] text-[var(--ink)] md:text-[2.35rem]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1.5 text-[13px] font-medium text-[var(--ink-soft)] md:text-[14px]">
              作者：{subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[rgba(24,29,38,0.08)] bg-[#fbfcfd] px-4 py-3 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden w-10 shrink-0 md:block">
        {cover}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 truncate text-[15px] font-semibold leading-6 tracking-[0] text-[var(--ink)] md:text-[16px]">
              {title}
            </h1>
            {subtitle && (
              <>
                <span className="hidden h-1 w-1 shrink-0 rounded-full bg-[rgba(24,29,38,0.18)] md:block" />
                <p className="truncate text-[12px] font-medium text-[var(--ink-faint)] md:text-[13px]">
                  {subtitle}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
