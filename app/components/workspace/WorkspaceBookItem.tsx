"use client";

type ItemTone = "default" | "gifted" | "current";

export function WorkspaceBookItem({
  title,
  subtitle,
  badge,
  coverUrl,
  tone = "default",
  onClick,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  coverUrl?: string;
  tone?: ItemTone;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const toneClass =
    tone === "current"
      ? "border-[#9297a0] bg-[#eef1ef] shadow-[inset_0_0_0_1px_rgba(146,151,160,0.14)]"
      : tone === "gifted"
      ? "border-[#dddddd] bg-[#fbfbfa] hover:border-[#9297a0] hover:bg-[#fbfbfa]"
      : "border-transparent bg-transparent hover:border-[#dddddd] hover:bg-[#fbfbfa]";

  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-start justify-between gap-3 rounded-[7px] border px-2.5 py-2 transition-all ${toneClass}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {coverUrl && (
          <div className="h-9 w-[27px] shrink-0 overflow-hidden rounded-[3px] border border-[#dddddd] bg-[#f8fafc] shadow-[0_1px_1px_rgba(24,29,38,0.05)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[var(--ink)]">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--ink-faint)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium ${
            tone === "current"
              ? "border border-[rgba(10,46,14,0.18)] bg-[#fbfbfa] text-[var(--accent)]"
              : "border border-[#dddddd] bg-[#fbfbfa] text-[var(--ink-soft)]"
          }`}>
            {badge}
          </span>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-[7px] p-1 text-[var(--ink-faint)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#edf0f2] hover:text-[var(--ink)] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label={`删除 ${title}`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5L15 15M15 5L5 15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
