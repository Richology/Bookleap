"use client";

import { useState, type ReactNode } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";
import { CloseIcon } from "./icons/AdminIcons";

export type ExportFormat = "md" | "txt" | "json";
export type ExportStructure = "multi" | "single";
export type ExportTarget = "obsidian" | "notion" | "markdown" | "json";

export type ExportSection = {
  id: string;
  label: string;
};

export type ExportParams = {
  target: ExportTarget;
  format: ExportFormat;
  structure: ExportStructure;
  selectedSectionIds: string[];
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif";

const TARGET_OPTIONS: Array<{
  value: ExportTarget;
  label: string;
  helper: string;
  accent: string;
  icon: ReactNode;
  format: ExportFormat;
  structure: ExportStructure;
}> = [
  {
    value: "obsidian",
    label: "Obsidian",
    helper: "目录页与双链卡片",
    accent: "#7c5ce5",
    icon: <ObsidianIcon />,
    format: "md",
    structure: "multi",
  },
  {
    value: "notion",
    label: "Notion",
    helper: "总览页与卡片数据库",
    accent: "#1d1d1f",
    icon: <NotionIcon />,
    format: "md",
    structure: "single",
  },
  {
    value: "markdown",
    label: "Markdown",
    helper: "通用文本归档",
    accent: "#0f7490",
    icon: <MarkdownIcon />,
    format: "md",
    structure: "single",
  },
  {
    value: "json",
    label: "JSON",
    helper: "结构化数据",
    accent: "#b45309",
    icon: <JsonIcon />,
    format: "json",
    structure: "single",
  },
];

function ObsidianIcon() {
  return <BrandAssetIcon src="/icons/obsidian-color.svg" />;
}

function NotionIcon() {
  return <BrandAssetIcon src="/icons/notion.svg" />;
}

function BrandAssetIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 24,
        height: 24,
        backgroundImage: `url("${src}")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        display: "block",
      }}
    />
  );
}

function MarkdownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="4.25" fill="#e5f4f7" stroke="#0f7490" strokeWidth="1.3" />
      <path d="M6.7 15.7V9.1l2.55 3.05 2.55-3.05v6.6M15.25 9.1v5.8M13.2 12.85l2.05 2.05 2.05-2.05" stroke="#0f7490" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JsonIcon() {
  return <BrandAssetIcon src="/icons/json-file-svgrepo-com.svg" />;
}

function ArrowIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkmark() {
  return (
    <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden="true">
      <path d="m1.2 4 2.7 2.6L9.8 1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TargetPicker({
  target,
  disabled,
  onSelect,
}: {
  target: ExportTarget;
  disabled: boolean;
  onSelect: (target: ExportTarget) => void;
}) {
  return (
    <div role="group" aria-label="导出目标" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3, padding: 3, borderRadius: 14, background: "#f1f2f4" }}>
      {TARGET_OPTIONS.map((option) => {
        const active = target === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            style={{
              minWidth: 0,
              minHeight: 70,
              border: 0,
              borderRadius: 11,
              padding: "9px 5px 8px",
              background: active ? "#fff" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12), 0 5px 13px rgba(20,24,32,0.06)" : "none",
              color: active ? "#181d26" : "#747984",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontFamily: FONT,
              transition: "background 180ms ease, box-shadow 180ms ease, color 180ms ease, transform 100ms ease",
            }}
          >
            <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", color: option.accent, opacity: active ? 1 : 0.7 }}>
              {option.icon}
            </span>
            <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, lineHeight: 1.15, fontWeight: active ? 650 : 560 }}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionPicker({
  sections,
  selectedIds,
  open,
  disabled,
  onToggleOpen,
  onToggleSection,
  onSelectAll,
}: {
  sections: ExportSection[];
  selectedIds: string[];
  open: boolean;
  disabled: boolean;
  onToggleOpen: () => void;
  onToggleSection: (id: string) => void;
  onSelectAll: () => void;
}) {
  const allSelected = selectedIds.length === sections.length;

  return (
    <section style={{ border: "1px solid #e1e4e8", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <button
        type="button"
        onClick={onToggleOpen}
        disabled={disabled}
        aria-expanded={open}
        style={{ width: "100%", border: 0, background: "transparent", padding: "15px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", color: "#181d26", fontFamily: FONT, cursor: disabled ? "default" : "pointer" }}
      >
        <span style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 650 }}>导出内容</span>
          <span style={{ fontSize: 12, color: "#717782" }}>{selectedIds.length} 张精华卡片已选</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#606772" }}>
          {open ? "完成" : "编辑"}
          <ArrowIcon open={open} />
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #edf0f2", padding: "11px 12px 13px", background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 3px 9px" }}>
            <button type="button" onClick={onSelectAll} disabled={disabled} style={{ border: 0, padding: "3px 5px", background: "transparent", color: "#4e6979", fontSize: 12, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: FONT }}>
              {allSelected ? "清空" : "全选"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
            {sections.map((section) => {
              const selected = selectedIds.includes(section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onToggleSection(section.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  style={{ minWidth: 0, border: selected ? "1px solid #bcc8ce" : "1px solid #e0e4e7", borderRadius: 9, background: selected ? "#eef4f5" : "#fff", padding: "9px 10px", display: "flex", alignItems: "center", gap: 8, color: selected ? "#273941" : "#58606b", fontFamily: FONT, textAlign: "left", cursor: disabled ? "default" : "pointer", transition: "background 150ms ease, border-color 150ms ease, transform 100ms ease" }}
                >
                  <span style={{ width: 17, height: 17, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: selected ? "#344e5a" : "#fff", border: selected ? "1px solid #344e5a" : "1px solid #b9c0c7", color: "#fff" }}>
                    {selected && <Checkmark />}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 560 }}>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function ExportSummary({
  target,
  structure,
  selectedCount,
}: {
  target: ExportTarget;
  structure: ExportStructure;
  selectedCount: number;
}) {
  const option = TARGET_OPTIONS.find((item) => item.value === target)!;
  const files = target === "obsidian"
    ? [`书籍总览.md`, `${selectedCount} 张知识卡片.md`]
    : target === "notion"
      ? ["书籍总览.md", "知识卡片.csv"]
      : target === "json"
        ? ["知识包.json"]
        : [structure === "single" ? "知识包.md" : `${selectedCount} 个 Markdown 文件`];

  return (
    <section aria-live="polite" style={{ borderRadius: 14, padding: "15px 16px", background: "#f4f6f7", border: "1px solid #e1e5e7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 10, background: "#fff", boxShadow: "0 1px 2px rgba(24,29,38,0.08)", color: option.accent }}>
          {option.icon}
        </span>
        <span style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: "#242831" }}>导出到 {option.label}</span>
          <span style={{ fontSize: 12, color: "#707782" }}>{option.helper}</span>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 13 }}>
        {files.map((file) => (
          <span key={file} style={{ borderRadius: 6, padding: "4px 7px", background: "rgba(255,255,255,0.84)", color: "#59616b", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, lineHeight: 1.3 }}>
            {file}
          </span>
        ))}
      </div>
    </section>
  );
}

function StructurePicker({ structure, disabled, onChange }: { structure: ExportStructure; disabled: boolean; onChange: (value: ExportStructure) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
      {([
        ["single", "单个文件"],
        ["multi", "分别保存"],
      ] as const).map(([value, label]) => {
        const active = structure === value;
        return (
          <button key={value} type="button" onClick={() => onChange(value)} disabled={disabled} aria-pressed={active} style={{ minHeight: 40, borderRadius: 10, border: active ? "1px solid #9eaeb5" : "1px solid #e0e4e7", background: active ? "#edf3f5" : "#fff", color: active ? "#253b45" : "#606772", fontSize: 12.5, fontWeight: active ? 650 : 560, fontFamily: FONT, cursor: disabled ? "default" : "pointer", transition: "background 150ms ease, border-color 150ms ease, transform 100ms ease" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ExportModal({
  availableSections,
  onExport,
  onClose,
  exportStatus,
  onRestart,
}: {
  availableSections: ExportSection[];
  onExport: (params: ExportParams) => void;
  onClose: () => void;
  exportStatus: "idle" | "exporting" | "success";
  onRestart: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("md");
  const [structure, setStructure] = useState<ExportStructure>("multi");
  const [target, setTarget] = useState<ExportTarget>("obsidian");
  const [selectedIds, setSelectedIds] = useState<string[]>(availableSections.map((section) => section.id));
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);
  const isExporting = exportStatus === "exporting";
  const canExport = selectedIds.length > 0 && !isExporting;
  const targetOption = TARGET_OPTIONS.find((option) => option.value === target)!;

  const selectTarget = (value: ExportTarget) => {
    const next = TARGET_OPTIONS.find((option) => option.value === value);
    if (!next) return;
    setTarget(value);
    setFormat(next.format);
    setStructure(next.structure);
  };

  const toggleSection = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAllSections = () => {
    setSelectedIds((current) => current.length === availableSections.length ? [] : availableSections.map((section) => section.id));
  };

  if (exportStatus === "success") {
    return (
      <div data-export-modal style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(24,29,38,0.34)", backdropFilter: "blur(8px) saturate(120%)", fontFamily: FONT, ...overlayStyle }}>
        <section style={{ width: "100%", maxWidth: 400, overflow: "hidden", borderRadius: 20, background: "rgba(255,255,255,0.94)", boxShadow: "0 24px 64px rgba(20,24,32,0.24)", ...panelStyle }} role="dialog" aria-modal="true" aria-labelledby="export-success-title">
          <div style={{ padding: "32px 28px 24px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 14px", borderRadius: 15, background: "#e9f3ed", color: "#2f6b45" }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5.2 12.3 4.25 4.2L18.9 7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 id="export-success-title" style={{ margin: 0, color: "#1d1f23", fontSize: 19, lineHeight: 1.25, fontWeight: 700 }}>知识包已准备好</h2>
            <p style={{ margin: "8px 0 0", color: "#747984", fontSize: 13, lineHeight: 1.55 }}>已开始下载，可导入 {targetOption.label} 继续整理。</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 16px 16px", borderTop: "1px solid #e7e9eb" }}>
            <button type="button" onClick={onRestart} style={{ minHeight: 42, border: "1px solid #d9dde1", borderRadius: 11, background: "#fff", color: "#424750", fontFamily: FONT, fontWeight: 600, cursor: "pointer" }}>再导出</button>
            <button type="button" onClick={handleClose} style={{ minHeight: 42, border: 0, borderRadius: 11, background: "#1d1f23", color: "#fff", fontFamily: FONT, fontWeight: 650, cursor: "pointer" }}>完成</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      data-export-modal
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))", background: "rgba(24,29,38,0.38)", backdropFilter: "blur(8px) saturate(120%)", fontFamily: FONT, ...overlayStyle }}
      onClick={(event) => { if (event.target === event.currentTarget && !isExporting) handleClose(); }}
    >
      <section style={{ width: "min(100%, 620px)", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.96)", boxShadow: "0 24px 72px rgba(20,24,32,0.26)", ...panelStyle }} role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "19px 22px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: 0, gap: 11 }}>
            <span style={{ width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 10, background: "#eef3f4", color: "#344e5a" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18.5v1.1c0 .77.63 1.4 1.4 1.4h11.2c.77 0 1.4-.63 1.4-1.4v-1.1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 id="export-modal-title" style={{ margin: 0, color: "#1d1f23", fontSize: 17, lineHeight: 1.25, fontWeight: 700 }}>导出知识包</h2>
              <p style={{ margin: "3px 0 0", color: "#7a8089", fontSize: 12, lineHeight: 1.35 }}>将阅读成果带进你的知识库</p>
            </div>
          </div>
          <button type="button" aria-label="关闭导出窗口" onClick={handleClose} disabled={isExporting} style={{ width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center", border: "1px solid #dfe2e5", borderRadius: "50%", background: "rgba(255,255,255,0.8)", color: "#6d737c", cursor: isExporting ? "default" : "pointer" }}>
            <CloseIcon style={{ width: 15, height: 15 }} aria-hidden="true" />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "2px 22px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section>
              <p style={{ margin: "0 0 9px", color: "#707782", fontSize: 12, fontWeight: 650 }}>导出到</p>
              <TargetPicker target={target} disabled={isExporting} onSelect={selectTarget} />
            </section>

            <ExportSummary target={target} structure={structure} selectedCount={selectedIds.length} />

            <SectionPicker
              sections={availableSections}
              selectedIds={selectedIds}
              open={isSectionPickerOpen}
              disabled={isExporting}
              onToggleOpen={() => setIsSectionPickerOpen((current) => !current)}
              onToggleSection={toggleSection}
              onSelectAll={toggleAllSections}
            />

            {target === "markdown" && (
              <section>
                <p style={{ margin: "0 0 9px", color: "#707782", fontSize: 12, fontWeight: 650 }}>文件组织</p>
                <StructurePicker structure={structure} disabled={isExporting} onChange={setStructure} />
              </section>
            )}

            {selectedIds.length === 0 && <p style={{ margin: "-8px 0 0", color: "#a04a24", fontSize: 12 }}>请至少保留一张精华卡片。</p>}
          </div>
        </div>

        <footer style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 22px calc(15px + env(safe-area-inset-bottom))", borderTop: "1px solid #e7e9eb", background: "rgba(255,255,255,0.86)", backdropFilter: "blur(16px) saturate(130%)", flexShrink: 0 }}>
          <button type="button" onClick={handleClose} disabled={isExporting} style={{ minHeight: 44, padding: "0 17px", border: "1px solid #d9dde1", borderRadius: 12, background: "#fff", color: "#555b64", fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: isExporting ? "default" : "pointer" }}>取消</button>
          <button type="button" onClick={() => { if (canExport) onExport({ target, format, structure, selectedSectionIds: selectedIds }); }} disabled={!canExport} style={{ flex: 1, minHeight: 44, border: 0, borderRadius: 12, background: canExport ? "#1d1f23" : "#aeb3ba", color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 650, cursor: canExport ? "pointer" : "default", boxShadow: canExport ? "0 6px 14px rgba(24,29,38,0.16)" : "none" }}>
            {isExporting ? "正在准备知识包…" : `导出到 ${targetOption.label}`}
          </button>
        </footer>
      </section>

      <style>{`
        [data-export-modal] button:not(:disabled):active { transform: scale(0.98); }
        [data-export-modal] button:focus-visible { outline: 2px solid #667d89; outline-offset: 2px; }
        @media (max-width: 480px) {
          [role="group"][aria-label="导出目标"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 1ms !important; }
        }
        @media (prefers-reduced-transparency: reduce) {
          [data-export-modal] section { background: #fff !important; backdrop-filter: none !important; }
        }
      `}</style>
    </div>
  );
}
