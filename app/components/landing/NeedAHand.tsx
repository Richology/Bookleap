"use client";

import { useEffect, useState } from "react";

const OPTIONS = [
  { icon: "📚", label: "这些书值得一读，推荐给你" },
  { icon: "🔖", label: "如何获取电子书" },
  { icon: "☕", label: "工作或生活遇到难题？来聊聊" },
];

const WECHAT_ID = "iwbr1988";

export function NeedAHand() {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setEntered(true), 1200);
    const t2 = setTimeout(() => setShowHint(true), 2800);
    const t3 = setTimeout(() => setShowHint(false), 6800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = WECHAT_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
        transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Panel */}
      {isOpen && (
        <div
          className="w-72 rounded-[22px] border border-[var(--ghost-border)] bg-[var(--paper)] p-5 shadow-[var(--shadow-paper-strong)]"
          style={{ animation: "fadeSlideIn 0.25s ease-out both" }}
        >
          {showQR ? (
            <div>
              <button
                onClick={() => setShowQR(false)}
                className="mb-4 flex items-center gap-1 text-xs text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                返回
              </button>
              <div className="mx-auto mb-4 h-44 w-44 overflow-hidden rounded-[18px] bg-[var(--surface-low)]">
                <img
                  src="/wechat-qr-only.png"
                  alt="微信二维码"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm text-[var(--ink-soft)]">
                    微信号：<span className="font-medium text-[var(--ink)]">{WECHAT_ID}</span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="rounded-sm border border-[var(--ghost-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-soft)] transition-all hover:bg-[var(--surface-low)] hover:text-[var(--ink)] active:scale-95"
                  >
                    {copied ? "已复制 ✓" : "复制"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
                  扫码或搜索微信号添加
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[var(--ink)] text-sm font-bold text-[#faf7f6]">
                  安
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    嗨，我是安瑟
                  </p>
                  <p className="text-xs text-[var(--ink-faint)]">书跃的主理人</p>
                </div>
              </div>
              <div className="space-y-2">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setShowQR(true)}
                    className="flex w-full items-center gap-2.5 rounded-[16px] bg-[var(--surface-low)] px-3.5 py-2.5 text-left text-sm text-[var(--ink-soft)] transition-all hover:bg-[var(--surface-high)] hover:text-[var(--ink)] active:scale-[0.99]"
                  >
                    <span className="text-base">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hint tooltip */}
      <div
        className="pointer-events-none flex items-center gap-2"
        style={{
          opacity: showHint && !isOpen ? 1 : 0,
          transform: showHint && !isOpen ? "translateX(0)" : "translateX(8px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <span className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">
          👋 有任何问题，随时找我
        </span>
      </div>

      {/* Floating button with pulse */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowHint(false);
          if (isOpen) setShowQR(false);
        }}
        className="need-a-hand-btn relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {!isOpen && (
          <span className="need-a-hand-pulse absolute inset-0 rounded-full bg-[var(--ink)]" />
        )}
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
