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

const FONT = "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const TARGET_OPTIONS: Array<{
  value: ExportTarget;
  label: string;
  desc: string;
  icon: ReactNode;
  format: ExportFormat;
  structure: ExportStructure;
}> = [
  {
    value: "obsidian",
    label: "Obsidian",
    desc: "分文件 Markdown，适合放进 Vault",
    icon: <ObsidianIcon />,
    format: "md",
    structure: "multi",
  },
  {
    value: "notion",
    label: "Notion",
    desc: "总览页 + 卡片数据库，适合沉淀知识",
    icon: <NotionIcon />,
    format: "md",
    structure: "single",
  },
  {
    value: "markdown",
    label: "Markdown",
    desc: "通用 .md 文件，方便归档复用",
    icon: <MarkdownIcon />,
    format: "md",
    structure: "single",
  },
  {
    value: "json",
    label: "JSON",
    desc: "结构化数据，适合二次开发",
    icon: <JsonIcon />,
    format: "json",
    structure: "single",
  },
];

const STRUCTURE_OPTIONS: Array<{ value: ExportStructure; label: string; desc: string }> = [
  { value: "multi", label: "分文件导出", desc: "每个章节保存为独立文件，适合知识库整理" },
  { value: "single", label: "单文件导出", desc: "全部内容合并为一个文件，适合直接使用" },
];

const TARGET_NOTICE: Record<ExportTarget, string> = {
  obsidian: "将生成目录页、分卡片 Markdown、YAML 元数据和 Obsidian 双链。",
  notion: "将生成书籍总览 Markdown 和卡片 CSV；CSV 可直接导入为 Notion 数据库。",
  markdown: "将生成通用 Markdown 文件，可选择单文件或分文件。",
  json: "将生成结构化 JSON，保留书籍信息、卡片类型和原始内容。",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 600, color: "#7b8088", letterSpacing: "0.04em" }}>
      {text}
    </p>
  );
}

function ExportTargetCard({
  active,
  label,
  desc,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  desc: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 13px",
        borderRadius: 10,
        border: active ? "1.5px solid #9297a0" : "1.5px solid #dddddd",
        background: active ? "#eef1ef" : "#f8fafc",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.14s, background 0.14s",
        width: "100%",
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: active ? "1px solid rgba(24,29,38,0.20)" : "1px solid #dddddd",
          background: active ? "#fbfbfa" : "#ffffff",
          color: "#181d26",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.14s, background 0.14s",
        }}
      >
        {icon}
      </span>
      <span style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 650, color: "#181d26" }}>{label}</span>
        <span style={{ fontSize: 11.5, color: "#7b8088", lineHeight: 1.5 }}>{desc}</span>
      </span>
    </button>
  );
}

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
      <path d="M4.2 5.2h15.6c.8 0 1.4.6 1.4 1.4v10.8c0 .8-.6 1.4-1.4 1.4H4.2c-.8 0-1.4-.6-1.4-1.4V6.6c0-.8.6-1.4 1.4-1.4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.2 15.7V8.6l2.7 3.2 2.7-3.2v7.1M15.5 8.6v6.7M13.2 13.2l2.3 2.3 2.3-2.3" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JsonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 3.8h8.4l3.2 3.2v13.2H6.2V3.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.6 3.8v3.4h3.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.4 10.4c-1 .2-1.5.8-1.5 1.7v.5c0 .6-.3 1-.8 1.1.5.1.8.5.8 1.1v.5c0 .9.5 1.5 1.5 1.7M14.6 10.4c1 .2 1.5.8 1.5 1.7v.5c0 .6.3 1 .8 1.1-.5.1-.8.5-.8 1.1v.5c0 .9-.5 1.5-1.5 1.7" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.4 14h1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SingleFileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.4 3.8h8.2l3 3v13.4H6.4V3.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.6 3.8v3.3h3" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M9 11.2h6M9 14h6M9 16.8h3.8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function ExportPreview({
  target,
  structure,
  sections,
}: {
  target: ExportTarget;
  structure: ExportStructure;
  sections: ExportSection[];
}) {
  const sampleSections = sections.slice(0, 3).map((section) => section.label);
  const remaining = Math.max(sections.length - sampleSections.length, 0);
  const files = (() => {
    if (target === "obsidian") {
      return ["书籍总览.md", ...sampleSections.map((title, index) => `${String(index + 1).padStart(2, "0")} - ${title}.md`)];
    }
    if (target === "notion") return ["书籍总览.md", "知识卡片.csv"];
    if (target === "json") return ["知识包.json"];
    return [structure === "single" ? "知识包.md" : "01 - 精华卡片.md"];
  })();

  return (
    <div style={{ marginTop: 14, padding: "12px 13px", border: "1px solid #dde2e5", borderRadius: 8, background: "#f8fafc" }}>
      <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 650, color: "#555b65" }}>导出预览</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {files.map((file) => (
          <span key={file} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, color: "#41454d", lineHeight: 1.5 }}>
            {target === "obsidian" && file !== "书籍总览.md" ? "  └ " : "  "}{file}
          </span>
        ))}
        {target === "obsidian" && remaining > 0 && (
          <span style={{ fontSize: 11.5, color: "#7b8088" }}>  └ 还有 {remaining} 张知识卡片</span>
        )}
      </div>
    </div>
  );
}

function CheckChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 12px",
        borderRadius: 8,
        border: checked ? "1.5px solid #181d26" : "1.5px solid #dddddd",
        background: checked ? "#181d26" : "#f8fafc",
        cursor: "pointer",
        fontFamily: FONT,
        transition: "background 0.14s, border-color 0.14s",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          border: checked ? "none" : "1.5px solid #9297a0",
          background: checked ? "#fbfbfa" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="#181d26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: checked ? "#fbfbfa" : "#41454d" }}>
        {label}
      </span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
  const [selectedIds, setSelectedIds] = useState<string[]>(
    availableSections.map((s) => s.id)
  );
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onClose);

  const toggleSection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isExporting = exportStatus === "exporting";
  const canExport = selectedIds.length > 0 && !isExporting;

  const handleClickExport = () => {
    if (!canExport) return;
    onExport({ target, format, structure, selectedSectionIds: selectedIds });
  };

  const selectTarget = (value: ExportTarget) => {
    const targetOption = TARGET_OPTIONS.find((option) => option.value === value);
    if (!targetOption) return;
    setTarget(value);
    setFormat(targetOption.format);
    setStructure(targetOption.structure);
  };

  // ── Success screen ─────────────────────────────────────
  if (exportStatus === "success") {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(24,29,38,0.34)", backdropFilter: "blur(2px)",
          padding: "20px 16px", fontFamily: FONT,
          ...overlayStyle,
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 420, background: "#fbfbfa",
            border: "1px solid #9297a0",
            borderRadius: 12, boxShadow: "0 18px 44px rgba(24,29,38,0.18)",
            overflow: "hidden",
            ...panelStyle,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 16px", borderBottom: "1px solid #dddddd" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#181d26" }}>导出知识包</p>
            <button onClick={handleClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #dddddd", background: "#f8fafc", cursor: "pointer", color: "#7b8088", fontSize: 14 }}>
              <CloseIcon style={{ width: 14, height: 14 }} aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "40px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {/* Check icon */}
            <div style={{ width: 52, height: 52, borderRadius: 12, border: "1px solid #dddddd", background: "#eef1ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#181d26" }}>已生成知识包</p>
            <p style={{ margin: 0, fontSize: 13, color: "#7b8088" }}>文件已保存至你的下载目录</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
            <button
              onClick={onRestart}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #dddddd", background: "#f8fafc", fontSize: 14, color: "#41454d", cursor: "pointer", fontFamily: FONT }}
            >
              再导出一个
            </button>
            <button
              onClick={handleClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#181d26", fontSize: 14, fontWeight: 600, color: "#fbfbfa", cursor: "pointer", fontFamily: FONT }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main export screen ─────────────────────────────────
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(24,29,38,0.34)", backdropFilter: "blur(2px)",
        padding: "20px 16px", fontFamily: FONT,
        ...overlayStyle,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) handleClose();
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 440, background: "#fbfbfa",
          border: "1px solid #9297a0",
          borderRadius: 12, boxShadow: "0 18px 44px rgba(24,29,38,0.18)",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          overflow: "hidden",
          ...panelStyle,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 16px", borderBottom: "1px solid #dddddd", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#181d26" }}>导出知识包</p>
          <button
            onClick={handleClose}
            disabled={isExporting}
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #dddddd", background: "#f8fafc", cursor: isExporting ? "default" : "pointer", color: "#7b8088", fontSize: 14 }}
          >
            <CloseIcon style={{ width: 14, height: 14 }} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 8px" }}>
          {/* Description */}
          <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#41454d", lineHeight: 1.65 }}>
            把书跃生成的精华卡片整理成知识对象，保存、归档或导入你的第二大脑。
          </p>

          {/* Section selection */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel text="选择章节" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {availableSections.map((s) => (
                <CheckChip
                  key={s.id}
                  checked={selectedIds.includes(s.id)}
                  label={s.label}
                  onChange={() => toggleSection(s.id)}
                />
              ))}
            </div>
            {selectedIds.length === 0 && (
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#f59e0b" }}>
                请至少选择一个章节
              </p>
            )}
          </div>

          {/* Target */}
          <div style={{ marginBottom: format === "json" ? 0 : 20 }}>
            <SectionLabel text="导出到" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {TARGET_OPTIONS.map(({ value, label, desc, icon }) => (
                <ExportTargetCard
                  key={value}
                  active={target === value}
                  label={label}
                  desc={desc}
                  icon={icon}
                  onClick={() => selectTarget(value)}
                />
              ))}
            </div>
            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#7b8088", lineHeight: 1.6 }}>
              {TARGET_NOTICE[target]}
            </p>
            <ExportPreview target={target} structure={structure} sections={availableSections.filter((section) => selectedIds.includes(section.id))} />
          </div>

          {/* Structure (only needed for generic Markdown) */}
          {target === "markdown" && (
            <div style={{ marginBottom: 4 }}>
              <SectionLabel text="导出结构" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STRUCTURE_OPTIONS.map(({ value, label, desc }) => (
                  <ExportTargetCard
                    key={value}
                    active={structure === value}
                    label={label}
                    desc={desc}
                    icon={value === "multi" ? <MarkdownIcon /> : <SingleFileIcon />}
                    onClick={() => setStructure(value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, display: "flex", gap: 10, padding: "16px 24px", borderTop: "1px solid #dddddd" }}>
          <button
            onClick={handleClose}
            disabled={isExporting}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #dddddd", background: "#f8fafc", fontSize: 14, color: "#41454d", cursor: isExporting ? "default" : "pointer", fontFamily: FONT }}
          >
            取消
          </button>
          <button
            onClick={handleClickExport}
            disabled={!canExport}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: !canExport ? "#9297a0" : "#181d26",
              fontSize: 14, fontWeight: 600, color: "#fbfbfa",
              cursor: !canExport ? "default" : "pointer",
              fontFamily: FONT,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {isExporting ? (
              <>
                <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                导出中…
              </>
            ) : (
              "开始导出"
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
