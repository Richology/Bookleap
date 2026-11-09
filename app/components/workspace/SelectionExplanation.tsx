'use client';

import { createPortal } from 'react-dom';
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import type { BookContext, StoredBookContext } from '@/lib/bookAnalysis/context';
import { explanationSources, selectionError } from '@/lib/bookAnalysis/selectionExplanation.mjs';

type Result = {explanation: string; example: string; evidence: {sourceId: string; chapterTitle: string; chapterIndex: number; quote: string}[]};
type Pick = {text: string; x: number; y: number};

export type SelectionExplanationHandle = { explain: (text: string) => void };

export default function SelectionExplanation({children, title, cardContent, context, onCreateQuote, ref}: {
  children: ReactNode; title: string; cardContent: string; context?: BookContext | StoredBookContext; onCreateQuote?: () => void; ref?: Ref<SelectionExplanationHandle>;
}) {
  const content = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const origin = useRef<{element: Element; top: number}[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const capture = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) { setPick(null); return; }
        const range = selection.getRangeAt(0);
        if (!content.current?.contains(range.commonAncestorContainer)) { setPick(null); return; }
        const rect = range.getBoundingClientRect();
        setPick({text: selection.toString(), x: Math.max(12, Math.min(window.innerWidth - 292, rect.left)), y: Math.max(12, Math.min(window.innerHeight - 60, rect.bottom + 12))});
      }, 120);
    };
    document.addEventListener('selectionchange', capture);
    document.addEventListener('touchend', capture);
    document.addEventListener('mouseup', capture);
    window.addEventListener('scroll', capture, true);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
      document.removeEventListener('selectionchange', capture);
      document.removeEventListener('touchend', capture);
      document.removeEventListener('mouseup', capture);
      window.removeEventListener('scroll', capture, true);
    };
  }, []);

  async function explain(text: string) {
    if (selectionError(text)) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setSelected(text); setPick(null); setStatus('loading'); setResult(null); setError('');
    window.getSelection()?.removeAllRanges();
    requestAnimationFrame(() => {
      panel.current?.scrollIntoView({block: 'nearest'});
      panel.current?.focus({preventScroll: true});
    });
    const timeout = setTimeout(() => request.abort(), 60000);
    try {
      // Send only the bounded original samples selected for this fragment.
      const response = await fetch('/api/skills/selection-explanation', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: request.signal,
        body: JSON.stringify({title, selection: text, cardContent: cardContent.slice(0, 12000), context: {samples: explanationSources(context, text)}}),
      });
      if (!response.ok) throw new Error('request failed');
      const data: Result = await response.json();
      if (!data.explanation || !Array.isArray(data.evidence)) throw new Error('invalid response');
      if (controller.current !== request) return;
      setResult(data); setStatus('done');
    } catch {
      if (controller.current !== request) return;
      setError('暂时无法解释，请重试。'); setStatus('error');
    } finally { clearTimeout(timeout); }
  }

  function close() {
    controller.current?.abort(); controller.current = null;
    setStatus('idle');
    requestAnimationFrame(() => {
      content.current?.focus({preventScroll: true});
      origin.current.forEach(({element, top}) => { element.scrollTop = top; });
    });
  }
  function beginExplanation(text: string) {
    origin.current = [];
    let element: Element | null = content.current;
    while (element) {
      origin.current.push({element, top: element.scrollTop});
      element = element.parentElement;
    }
    void explain(text);
  }
  useImperativeHandle(ref, () => ({explain: beginExplanation}));

  const invalid = pick ? selectionError(pick.text) : '';
  return <>
    <div ref={content} tabIndex={-1}>{children}</div>
    {pick && createPortal(<div data-selection-explanation-toolbar role="group" aria-label="选中文字操作" className="selection-explanation-toolbar" style={{'--selection-x': `${pick.x}px`, '--selection-y': `${pick.y}px`} as React.CSSProperties}>
      <div className="selection-actions">
        <button className="selection-action-explain" type="button" disabled={!!invalid} onPointerDown={e => e.preventDefault()} onClick={() => beginExplanation(pick.text)}><svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M5 3.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" /><path d="M7 7h6M7 10h4" /></svg><span>解释一下</span></button>
        
        <button type="button" disabled={!onCreateQuote} title={onCreateQuote ? undefined : '书摘图请选择 2–600 字'} onPointerDown={e => e.preventDefault()} onClick={() => { onCreateQuote?.(); setPick(null); }}><svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><rect x="4" y="2.5" width="12" height="15" rx="2" /><path d="M7 6.5h6M7 9.5h6M7 12.5h3" /></svg><span>生成书摘图</span></button>
      </div>
      {invalid && <p className="selection-actions-hint" role="status">{invalid}</p>}
    </div>, document.body)}
    {status !== 'idle' && <section ref={panel} tabIndex={-1} aria-label="划线解释" aria-busy={status === 'loading'} onKeyDown={e => {if (e.key === 'Escape') {e.stopPropagation(); close();}}} className="mx-auto mt-5 max-w-[42rem] rounded-xl border border-[rgba(24,29,38,0.12)] bg-[var(--paper)] p-5 text-sm leading-7 text-[var(--ink)]">
      <div className="flex items-center justify-between gap-4"><strong>划线解释</strong><button type="button" onClick={close} className="shrink-0 rounded px-2 py-1 text-[var(--accent)]">收起解释</button></div>
      <blockquote className="my-3 max-h-28 overflow-auto border-l-2 border-[var(--accent)] pl-3 text-[var(--ink-soft)]">{selected}</blockquote>
      <div role="status" aria-live="polite">
        {status === 'loading' && <p>正在解释…</p>}
        {status === 'error' && <p>{error} <button type="button" className="underline" onClick={() => void explain(selected)}>重试</button></p>}
        {result && <>
          <h4 className="font-semibold">通俗解释</h4><p className="whitespace-pre-wrap">{result.explanation}</p>
          {result.example && <><h4 className="mt-4 font-semibold">辅助理解的例子（AI 生成）</h4><p>{result.example}</p></>}
          <h4 className="mt-4 font-semibold">原文依据</h4>
          {result.evidence.length ? result.evidence.map((e, i) => <blockquote key={`${e.sourceId}-${i}`} className="my-2 border-l-2 border-[var(--accent)] pl-3"><p>{e.quote}</p><footer className="text-xs text-[var(--ink-soft)]">{e.chapterTitle} · 原文片段 {e.sourceId}</footer></blockquote>) : <p>暂未找到可核对的原文位置。以上解释基于现有上下文，依据有限。</p>}
        </>}
      </div>
    </section>}
  </>;
}
