"use client";

import { useState } from "react";
import { CloseIcon } from "./icons/AdminIcons";

const SUPPORT_AMOUNTS = ["9.9", "29.9", "99.9", "任意金额"] as const;

export function SupportCoffeeModal({ onClose }: { onClose: () => void }) {
  const [selectedAmount, setSelectedAmount] =
    useState<(typeof SUPPORT_AMOUNTS)[number]>("9.9");
  const amountLabel = selectedAmount === "任意金额" ? "任意金额" : `${selectedAmount} 元`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(24,29,38,0.34)] px-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[#dfe4e8] bg-[#fbfcfd] shadow-[0_18px_44px_rgba(24,29,38,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e8eb] px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">
              请书跃喝杯咖啡
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--ink-faint)]">
              如果书跃帮助了你，那请开发者喝杯咖啡吧。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[8px] p-1.5 text-[var(--ink-faint)] transition-colors hover:bg-[#f1f3f4] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0]"
            aria-label="关闭赞赏弹窗"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-4 gap-2">
            {SUPPORT_AMOUNTS.map((amount) => {
              const isSelected = selectedAmount === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSelectedAmount(amount)}
                  className={`rounded-[10px] border px-2 py-2.5 text-[13px] font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9297a0] ${
                    isSelected
                      ? "border-[#181d26] bg-[#181d26] text-[#fbfcfd]"
                      : "border-[#dfe4e8] bg-[#f8fafc] text-[var(--ink-soft)] hover:border-[#9297a0] hover:bg-[#fbfcfd] hover:text-[var(--ink)]"
                  }`}
                >
                  {amount}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[12px] border border-[#e5e8eb] bg-[#f8fafc] p-4">
            <div className="mx-auto h-[220px] w-[220px] overflow-hidden rounded-[10px] border border-[#dfe4e8] bg-[#fbfcfd] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wechat-pay-qrcode.jpg"
                alt="微信收款二维码"
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mt-4 text-center text-[13px] font-medium text-[var(--ink)]">
              当前选择：{amountLabel}
            </p>
            <p className="mt-1 text-center text-[12px] leading-5 text-[var(--ink-faint)]">
              请扫码后在微信里按当前选择金额支付。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
