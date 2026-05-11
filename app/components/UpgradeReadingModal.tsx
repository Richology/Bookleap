"use client";

import { useEffect, useState } from "react";

export function UpgradeReadingModal({
  isOpen,
  onClose,
  wechatId = "iwbr1988",
  qrImageSrc = "/wechat-qr.png",
}: {
  isOpen: boolean;
  onClose: () => void;
  wechatId?: string;
  qrImageSrc?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wechatId).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(24,29,38,0.34)] backdrop-blur-[2px] transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative z-10 mx-4 w-full max-w-md transform overflow-hidden rounded-[12px] border border-[#9297a0] bg-[#fbfbfa] shadow-[0_18px_44px_rgba(24,29,38,0.18)] transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-[8px] border border-[#dddddd] bg-[#f8fafc] p-2 text-[var(--ink-faint)] transition hover:border-[#9297a0] hover:text-[var(--ink)]"
          aria-label="关闭"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative max-h-[90vh] overflow-y-auto p-6 text-center scrollbar-hide sm:p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#dddddd] bg-[#f8fafc]">
            <span className="text-xl">礼</span>
          </div>
          
          <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">
            卡在了这个模式里？
          </h3>
          
          <div className="mb-5 space-y-2 rounded-[10px] border border-[#dddddd] bg-[#f8fafc] p-4 text-left text-[13px] leading-relaxed text-[var(--ink-soft)]">
            <p>
              测试仅仅是第一步。这背后往往隐藏着真实生活中<strong className="font-semibold text-[var(--ink)]">反复遇到的卡点</strong>。
            </p>
            <p>
              我是主理人安瑟。基于你的反馈模式，我为你准备了一份<strong className="font-semibold text-[var(--ink)]">「破局专属进阶书单」</strong>。
            </p>
            <p>
              如果你想改变现状，不如加个微信聊聊，我把书单发你。
            </p>
          </div>

          <div className="mb-4 mx-auto flex h-48 w-full max-w-[200px] items-center justify-center overflow-hidden rounded-[10px] border border-[#dddddd] bg-[#f8fafc] p-2 sm:h-52">
            <img 
              src={qrImageSrc} 
              alt="主理人微信二维码" 
              className="w-full h-full object-contain"
            />
          </div>

          <p className="mb-3 text-xs text-[var(--ink-faint)]">扫描上方二维码，或复制微信添加</p>

          <button
            onClick={handleCopy}
            className={`mx-auto flex h-10 w-full max-w-[200px] items-center justify-center gap-2 rounded-[10px] border text-[13px] font-medium transition-all ${
              copySuccess 
                ? "border-[rgba(10,46,14,0.18)] bg-[#eef1ef] text-[var(--accent)]" 
                : "border-[#dddddd] bg-[#f8fafc] text-[var(--ink-soft)] hover:border-[#9297a0] hover:text-[var(--ink)] active:scale-95"
            }`}
          >
            {copySuccess ? (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                已复制微信号
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                复制微信号 {wechatId}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
