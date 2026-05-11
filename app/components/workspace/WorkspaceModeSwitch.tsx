"use client";

export function WorkspaceModeSwitch({
  viewMode,
  onChange,
}: {
  viewMode: "card" | "immersive";
  onChange: (mode: "card" | "immersive") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[10px] border border-[#dddddd] bg-[#f8fafc] p-1">
      <button
        onClick={() => onChange("card")}
        className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-all ${
          viewMode === "card"
            ? "bg-[#181d26] text-[#fbfbfa]"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]`}
      >
        卡片模式
      </button>
      <button
        onClick={() => onChange("immersive")}
        className={`rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-all ${
          viewMode === "immersive"
            ? "bg-[#181d26] text-[#fbfbfa]"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]`}
      >
        沉浸阅读
      </button>
    </div>
  );
}
