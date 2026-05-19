"use client";

import { useEffect } from "react";
import { useModalTransition } from "@/app/hooks/useModalTransition";

export function WorkspaceDisclaimerModal({ onAccept }: { onAccept: () => void }) {
  const { handleClose, overlayStyle, panelStyle } = useModalTransition(onAccept);
  const disclaimerItems = [
    "本产品提供的书籍内容分析、卡片摘要与决策训练仅用于个人学习、认知训练和教育用途，不用于任何商业目的；",
    "本工具不会提供完整原文复制，也不允许用户将内容用于出版、销售或其他侵犯版权的行为；",
    "所有书籍内容均受版权保护，用户应保证使用时遵守相关法律法规。",
  ];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(24,29,38,0.34)] px-5 py-6 backdrop-blur-[2px]"
      style={overlayStyle}
      role="presentation"
    >
      <section
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-[12px] border border-[#9297a0] bg-[#fbfcfd] shadow-[0_18px_44px_rgba(24,29,38,0.18)]"
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-disclaimer-title"
      >
        <div className="border-b border-[#dfe4e8] px-6 pb-4 pt-5">
          <p
            id="workspace-disclaimer-title"
            className="text-base font-semibold leading-6 text-[var(--ink)]"
          >
            免责声明与使用说明
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm leading-7 text-[var(--ink-soft)]">
          <ol className="list-decimal space-y-2 pl-5">
            {disclaimerItems.map((item) => (
              <li key={item} className="pl-1">
                {item}
              </li>
            ))}
          </ol>

          <p>
            使用本产品即表示您已知晓并同意遵守以上规定。
          </p>
        </div>

        <div className="border-t border-[#dfe4e8] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-[#181d26] px-4 text-sm font-medium text-[#fbfcfd] transition hover:bg-[#0d1218] focus:outline-none focus:ring-2 focus:ring-[#9297a0] focus:ring-offset-2 focus:ring-offset-[#fbfcfd] active:scale-[0.99]"
          >
            我已阅读并同意
          </button>
        </div>
      </section>
    </div>
  );
}
