"use client";

import Link from "next/link";
import { useState } from "react";

type WorkspaceToolAction = {
  id: string;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  showCallout?: boolean;
  calloutText?: string;
  onDismissCallout?: () => void;
};

const WORKSPACE_WECHAT_ID = "iwbr1988";

function ToolIcon({ id }: { id: string }) {
  if (id === "search") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.1 4.1" />
      </svg>
    );
  }

  if (id === "fullscreen") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V4h5" />
        <path d="M20 9V4h-5" />
        <path d="M4 15v5h5" />
        <path d="M20 15v5h-5" />
      </svg>
    );
  }

  if (id === "backup") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 5.2c0-1.1 2.3-2 5.2-2s5.2.9 5.2 2-2.3 2-5.2 2-5.2-.9-5.2-2Z" />
        <path d="M4.8 5.2v4.6c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V5.2" />
        <path d="M4.8 9.8v4.6c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V9.8" />
      </svg>
    );
  }

  if (id === "coffee") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.2 7h8.2v3.9a3.6 3.6 0 0 1-3.6 3.6h-1a3.6 3.6 0 0 1-3.6-3.6V7Z" />
        <path d="M13.4 8.2h1.1a1.7 1.7 0 0 1 0 3.4h-1.1" />
        <path d="M6.2 16h7" />
        <path d="M7 4.2c.5.45.5.9 0 1.35M10 4.2c.5.45.5.9 0 1.35M13 4.2c.5.45.5.9 0 1.35" />
      </svg>
    );
  }

  if (id === "exitFullscreen") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4v5H4" />
        <path d="M15 4v5h5" />
        <path d="M9 20v-5H4" />
        <path d="M15 20v-5h5" />
      </svg>
    );
  }

  if (id === "training") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4.5h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 14 15.5H6A1.5 1.5 0 0 1 4.5 14V6A1.5 1.5 0 0 1 6 4.5Z" />
        <path d="M8 8.2h4M8 11.8h2.2" />
      </svg>
    );
  }

  if (id === "export") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3.8v8.4" />
        <path d="M6.8 9l3.2 3.2L13.2 9" />
        <path d="M4.8 14.5h10.4" />
      </svg>
    );
  }

  if (id === "share") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="10" r="1.8" />
        <circle cx="14" cy="5.5" r="1.8" />
        <circle cx="14" cy="14.5" r="1.8" />
        <path d="M7.7 9.1l4.7-2.5M7.7 10.9l4.7 2.5" />
      </svg>
    );
  }

  if (id === "feynman") {
    return (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4.5h10a1.2 1.2 0 0 1 1.2 1.2v8.6a1.2 1.2 0 0 1-1.2 1.2H5a1.2 1.2 0 0 1-1.2-1.2V5.7A1.2 1.2 0 0 1 5 4.5Z" />
        <path d="M6.8 8h6.4" />
        <path d="M6.8 11h3.8" />
        <path d="M13.2 11.2 15 13l-1.8 1.8" />
      </svg>
    );
  }

  return <span className="text-xs font-semibold">{id.slice(0, 1)}</span>;
}

function WorkspaceContactDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WORKSPACE_WECHAT_ID);
    } catch {
      const el = document.createElement("textarea");
      el.value = WORKSPACE_WECHAT_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative z-30">
      {isOpen && (
        <div className="absolute bottom-0 left-[calc(100%+10px)] w-[274px] overflow-hidden rounded-[12px] border border-[rgba(24,29,38,0.10)] bg-[#fbfcfd] shadow-[0_14px_34px_rgba(24,29,38,0.13)]">
          {showQR ? (
            <div className="p-4">
              <button
                type="button"
                onClick={() => setShowQR(false)}
                className="mb-3 flex items-center gap-1.5 rounded-[7px] px-1 py-1 text-[11px] font-medium text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5 7 10l5 5" />
                </svg>
                返回
              </button>

              <div className="mx-auto h-36 w-36 overflow-hidden rounded-[10px] bg-[#eef1f2]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/wechat-qr-only.png"
                  alt="微信二维码"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-3 text-center">
                <p className="text-[12px] font-medium text-[var(--ink-soft)]">
                  微信号：<span className="text-[var(--ink)]">{WORKSPACE_WECHAT_ID}</span>
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="mt-2 rounded-[8px] border border-[rgba(24,29,38,0.10)] bg-[#f7f8f9] px-3 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#eef1f2] hover:text-[var(--ink)] active:scale-[0.98]"
                >
                  {copied ? "已复制" : "复制微信号"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--ink)] text-[13px] font-semibold text-[#fbfcfd]">
                  安
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">嗨，我是安瑟</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-faint)]">书跃的主理人</p>
                </div>
              </div>

              <div className="space-y-1">
                {["这些书值得一读，推荐给你", "如何获取电子书", "工作或生活遇到难题？来聊聊"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[#f4f5f7] hover:text-[var(--ink)]"
                  >
                    <span className="truncate">{label}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m7.5 5 5 5-5 5" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (isOpen) setShowQR(false);
        }}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-[10px] border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] ${
          isOpen
            ? "border-[#9297a0] bg-[var(--workspace-accent-surface)] text-[var(--accent)]"
            : "border-[#dfe4e8] bg-[#fbfcfd] text-[var(--ink-soft)] shadow-[0_1px_2px_rgba(24,29,38,0.04)] hover:border-[#9297a0] hover:bg-[var(--workspace-accent-surface)] hover:text-[var(--ink)]"
        }`}
        aria-label={isOpen ? "关闭联系主理人" : "联系主理人"}
      >
        {isOpen ? (
          <svg className="h-[17px] w-[17px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5 15 15M15 5 5 15" />
          </svg>
        ) : (
          <>
            <span className="need-a-hand-pulse absolute inset-0 rounded-[10px] bg-[var(--ink)] opacity-10" />
            <svg className="relative h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </>
        )}
        {!isOpen && (
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[80] hidden -translate-y-1/2 rounded-[7px] border border-[#9297a0] bg-[#fbfcfd] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[0_8px_18px_rgba(24,29,38,0.12)] group-hover:block">
            联系主理人
          </span>
        )}
      </button>
    </div>
  );
}

export function WorkspaceToolRail({
  actions,
  utilityActions = [],
  bottomActions = [],
}: {
  actions: WorkspaceToolAction[];
  utilityActions?: WorkspaceToolAction[];
  bottomActions?: WorkspaceToolAction[];
}) {
  const renderActionButton = (action: WorkspaceToolAction) => (
    <div key={action.id} className="relative">
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-[10px] border transition-all ${
          action.active
            ? "border-[#9297a0] bg-[var(--workspace-accent-surface)] text-[var(--accent)]"
            : "border-transparent bg-transparent text-[var(--ink-soft)] hover:border-[#dfe4e8] hover:bg-[var(--workspace-accent-surface)] hover:text-[var(--ink)]"
        } ${action.disabled ? "cursor-not-allowed opacity-40" : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"}`}
        aria-label={action.label}
      >
        <ToolIcon id={action.id} />
        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[80] hidden -translate-y-1/2 rounded-[7px] border border-[#9297a0] bg-[#fbfcfd] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[0_8px_18px_rgba(24,29,38,0.12)] group-hover:block">
          {action.title}
        </span>
      </button>

      {action.showCallout && action.calloutText && (
        <div className="absolute bottom-0 left-[calc(100%+12px)] z-[90] w-[190px] rounded-[10px] border border-[#cfd6dc] bg-[#fbfcfd] px-3 py-2.5 text-[12px] leading-5 text-[var(--ink-soft)] shadow-[0_12px_28px_rgba(24,29,38,0.14)]">
          <span className="absolute bottom-3 left-[-5px] h-2.5 w-2.5 rotate-45 border-b border-l border-[#cfd6dc] bg-[#fbfcfd]" />
          <p className="pr-4">{action.calloutText}</p>
          {action.onDismissCallout && (
            <button
              type="button"
              onClick={action.onDismissCallout}
              className="absolute right-1.5 top-1.5 rounded-[6px] p-1 text-[var(--ink-faint)] transition-colors hover:bg-[#f1f3f4] hover:text-[var(--ink)]"
              aria-label="关闭提示"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3">
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="group relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] text-[var(--ink-soft)] shadow-[0_1px_2px_rgba(24,29,38,0.04)] transition-all hover:border-[#9297a0] hover:bg-[var(--workspace-accent-surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
          aria-label="返回首页"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 4.5L6 10l5.5 5.5" />
            <path d="M6.5 10H15" />
          </svg>
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[80] hidden -translate-y-1/2 rounded-[7px] border border-[#9297a0] bg-[#fbfcfd] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[0_8px_18px_rgba(24,29,38,0.12)] group-hover:block">
            返回首页
          </span>
        </Link>

        {utilityActions.length > 0 && (
          <div className="relative z-20 overflow-visible rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] p-1 shadow-[0_1px_2px_rgba(24,29,38,0.035)]">
            <div className="flex flex-col gap-1">
              {utilityActions.map(renderActionButton)}
            </div>
          </div>
        )}

        <div className="relative z-20 overflow-visible rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] p-1 shadow-[0_1px_2px_rgba(24,29,38,0.035)]">
          <div className="flex flex-col gap-1">
            {actions.map(renderActionButton)}
          </div>
        </div>
      </div>

      <div className="relative z-20 overflow-visible rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] p-1 shadow-[0_1px_2px_rgba(24,29,38,0.035)]">
        <div className="flex flex-col gap-1">
          {bottomActions.map(renderActionButton)}
          <WorkspaceContactDock />
        </div>
      </div>
    </div>
  );
}
