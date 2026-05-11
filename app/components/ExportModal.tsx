"use client";

import { useState } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";

export type ExportFormat = "md" | "txt" | "json";
export type ExportStructure = "multi" | "single";

export type ExportSection = {
  id: string;
  label: string;
};

export type ExportParams = {
  format: ExportFormat;
  structure: ExportStructure;
  selectedSectionIds: string[];
};

const FONT = "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; desc: string }> = [
  { value: "md", label: "Markdown", desc: ".md  适合 Obsidian、Notion 等知识库" },
  { value: "txt", label: "纯文本", desc: ".txt  去除 Markdown 符号，纯文字阅读" },
  { value: "json", label: "JSON", desc: ".json  结构化数据，适合程序处理或二次开发" },
];

const STRUCTURE_OPTIONS: Array<{ value: ExportStructure; label: string; desc: string }> = [
  { value: "multi", label: "分文件导出", desc: "每个章节保存为独立文件，适合知识库整理" },
  { value: "single", label: "单文件导出", desc: "全部内容合并为一个文件，适合直接使用" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 600, color: "#7b8088", letterSpacing: "0.04em" }}>
      {text}
    </p>
  );
}

function RadioCard({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        padding: "11px 13px",
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
          marginTop: 3,
          flexShrink: 0,
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: active ? "4px solid #181d26" : "1.5px solid #9297a0",
          background: "#fbfbfa",
          display: "inline-block",
          transition: "border 0.14s",
        }}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#181d26" }}>{label}</span>
        <span style={{ fontSize: 11.5, color: "#7b8088", lineHeight: 1.5 }}>{desc}</span>
      </span>
    </button>
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
    onExport({ format, structure, selectedSectionIds: selectedIds });
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
            <button onClick={handleClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #dddddd", background: "#f8fafc", cursor: "pointer", color: "#7b8088", fontSize: 14 }}>✕</button>
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
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 8px" }}>
          {/* Description */}
          <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#41454d", lineHeight: 1.65 }}>
            导出全部卡片内容，方便保存、归档或导入你的知识库（如 Obsidian）。
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

          {/* Format */}
          <div style={{ marginBottom: format === "json" ? 0 : 20 }}>
            <SectionLabel text="导出格式" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FORMAT_OPTIONS.map(({ value, label, desc }) => (
                <RadioCard
                  key={value}
                  active={format === value}
                  label={label}
                  desc={desc}
                  onClick={() => setFormat(value)}
                />
              ))}
            </div>
          </div>

          {/* Structure (hidden for JSON) */}
          {format !== "json" && (
            <div style={{ marginBottom: 4 }}>
              <SectionLabel text="导出结构" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STRUCTURE_OPTIONS.map(({ value, label, desc }) => (
                  <RadioCard
                    key={value}
                    active={structure === value}
                    label={label}
                    desc={desc}
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
