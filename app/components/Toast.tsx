"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function Toast({
  message,
  actionText,
  onAction,
  onClose,
  durationMs = 10000,
  showCloseButton = true,
  dismissible = true,
  secondaryActionText,
  onSecondaryAction,
}: {
  message: string | ReactNode;
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
  durationMs?: number;
  showCloseButton?: boolean;
  dismissible?: boolean;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearCloseTimer();
    setVisible(false);
    window.setTimeout(() => {
      onClose();
    }, 220);
  }, [clearCloseTimer, onClose]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    if (Number.isFinite(durationMs) && durationMs > 0) {
      closeTimerRef.current = window.setTimeout(() => {
        dismiss();
      }, durationMs);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearCloseTimer();
    };
  }, [clearCloseTimer, dismiss, durationMs]);

  return (
    <div
      className={`fixed z-[9990] bottom-4 left-1/2 w-[min(calc(100vw-24px),420px)] -translate-x-1/2 rounded-[12px] border border-[#dddddd] bg-[#fbfbfa] p-4 shadow-[0_8px_24px_rgba(24,29,38,0.12)] transition-all duration-200 md:bottom-6 md:left-auto md:right-6 md:w-[380px] md:translate-x-0 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#181d26]" />
        <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--ink-soft)]">
          {typeof message === "string" ? (
            <p className="whitespace-pre-line">{message}</p>
          ) : (
            message
          )}

          {(actionText || secondaryActionText) && (
            <div className="mt-3 flex items-center gap-2">
              {actionText && onAction && (
                <button
                  onClick={() => {
                    onAction();
                    dismiss();
                  }}
                  className="rounded-[9px] border border-[#dddddd] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition-all hover:border-[#9297a0] hover:bg-[#fbfbfa]"
                >
                  {actionText}
                </button>
              )}
              {secondaryActionText && onSecondaryAction && (
                <button
                  onClick={() => {
                    onSecondaryAction();
                    dismiss();
                  }}
                  className="rounded-[9px] px-3 py-1.5 text-xs font-medium text-[var(--ink-faint)] transition-all hover:text-[var(--ink)]"
                >
                  {secondaryActionText}
                </button>
              )}
            </div>
          )}
        </div>
        {showCloseButton && (
          <button
            onClick={() => {
              if (!dismissible) return;
              dismiss();
            }}
            className="shrink-0 rounded-[8px] p-1 text-[var(--ink-faint)] transition-colors hover:bg-[#f8fafc] hover:text-[var(--ink)]"
            aria-label="关闭提示"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
