"use client";

export function WorkspaceModeSwitch({
  viewMode,
  onChange,
}: {
  viewMode: "card" | "immersive";
  onChange: (mode: "card" | "immersive") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[10px] border border-[rgba(59,63,60,0.09)] bg-[rgba(240,242,237,0.92)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <button
        onClick={() => onChange("card")}
        className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-all ${
          viewMode === "card"
            ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgba(31,35,32,0.05)]"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        }`}
      >
        卡片模式
      </button>
      <button
        onClick={() => onChange("immersive")}
        className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-all ${
          viewMode === "immersive"
            ? "bg-[var(--paper)] text-[var(--ink)] shadow-[0_1px_2px_rgba(31,35,32,0.05)]"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        }`}
      >
        沉浸阅读
      </button>
    </div>
  );
}
