"use client";

type ItemTone = "default" | "gifted" | "current";

export function WorkspaceBookItem({
  title,
  subtitle,
  badge,
  tone = "default",
  onClick,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  tone?: ItemTone;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const toneClass =
    tone === "current"
      ? "border-[rgba(58,111,82,0.16)] bg-[rgba(230,238,232,0.92)]"
      : tone === "gifted"
      ? "border-[rgba(79,119,90,0.1)] bg-[rgba(240,245,241,0.68)]"
      : "border-transparent bg-[rgba(255,255,255,0.26)] hover:border-[rgba(59,63,60,0.07)] hover:bg-[rgba(255,255,255,0.74)]";

  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border px-2.5 py-2 transition-all ${toneClass}`}
    >
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

      <div className="flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            tone === "current"
              ? "bg-[rgba(58,111,82,0.12)] text-[var(--accent)]"
              : "bg-[rgba(59,63,60,0.05)] text-[var(--ink-soft)]"
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
            className="rounded-[7px] p-1 text-[var(--ink-faint)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[rgba(255,255,255,0.86)] hover:text-[var(--ink)]"
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
