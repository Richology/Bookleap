"use client";

import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import type { BookContext, StoredBookContext } from '@/lib/bookAnalysis/context';
import type { HighlightExplanation } from '@/lib/highlights';
import { explanationSources, selectionError } from '@/lib/bookAnalysis/selectionExplanation.mjs';

type Pick = {text: string; x: number; y: number};
type OpenOptions = {range?: Range; highlightId?: string; saved?: HighlightExplanation};
export type SelectionExplanationHandle = { explain: (text: string, options?: OpenOptions) => void };

export default function SelectionExplanation({children, title, cardContent, context, onCreateQuote, onRemember, onSaveExplanation, ref}: {
  children: ReactNode; title: string; cardContent: string; context?: BookContext | StoredBookContext;
  onCreateQuote?: () => void;
  onRemember: (text: string, range: Range) => {id: string; saved?: HighlightExplanation} | undefined;
  onSaveExplanation: (id: string, result: HighlightExplanation) => boolean;
  ref?: Ref<SelectionExplanationHandle>;
}) {
  const content = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const anchor = useRef<Range | null>(null);
  const highlightId = useRef<string | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [result, setResult] = useState<HighlightExplanation | null>(null);
  const [position, setPosition] = useState({left: 12, top: 12, maxHeight: 400});

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
    return () => {
      clearTimeout(timer); controller.current?.abort(); controller.current = null;
      document.removeEventListener('selectionchange', capture);
      document.removeEventListener('touchend', capture);
      document.removeEventListener('mouseup', capture);
    };
  }, []);

  const open = status !== 'idle';
  useLayoutEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const rect = anchor.current?.getBoundingClientRect() ?? content.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      const offsetTop = viewport?.offsetTop ?? 0;
      const below = height + offsetTop - rect.bottom - 24;
      const above = rect.top - offsetTop - 24;
      const maxHeight = Math.max(120, Math.min(440, height - 24, Math.max(below, above)));
      const measuredHeight = Math.min(panel.current?.scrollHeight ?? maxHeight, maxHeight);
      const top = below >= Math.min(300, measuredHeight) || below >= above ? rect.bottom + 10 : rect.top - measuredHeight - 10;
      setPosition({left: Math.max(12, Math.min(width - Math.min(420, width - 24) - 12, rect.left)), top: Math.max(offsetTop + 12, Math.min(offsetTop + height - measuredHeight - 12, top)), maxHeight});
    };
    positionPanel();
    const observer = new ResizeObserver(positionPanel);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('resize', positionPanel);
    return () => { observer.disconnect(); window.removeEventListener('scroll', positionPanel, true); window.removeEventListener('resize', positionPanel); window.visualViewport?.removeEventListener('resize', positionPanel); };
  }, [open, result, selected]);

  function close() {
    controller.current?.abort(); controller.current = null;
    setStatus('idle');
    content.current?.focus({preventScroll: true});
  }

  async function explain(text: string) {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setStatus('loading'); setResult(null);
    const timeout = setTimeout(() => request.abort(), 60000);
    try {
      const response = await fetch('/api/skills/selection-explanation', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: request.signal,
        body: JSON.stringify({title, selection: text, cardContent: cardContent.slice(0, 12000), context: {samples: explanationSources(context, text)}}),
      });
      if (!response.ok) throw new Error('request failed');
      const data: HighlightExplanation = await response.json();
      if (typeof data.explanation !== 'string' || !data.explanation.trim() || typeof data.example !== 'string') throw new Error('invalid response');
      if (controller.current !== request) return;
      setResult(data); setStatus('done');
      if (highlightId.current) onSaveExplanation(highlightId.current, data);
    } catch {
      if (controller.current === request) setStatus('error');
    } finally { clearTimeout(timeout); }
  }

  function beginExplanation(text: string, options?: OpenOptions) {
    if (selectionError(text)) return;
    const selection = window.getSelection();
    const range = options?.range ?? (selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : undefined);
    anchor.current = range ?? null;
    const mark = options?.highlightId ? {id: options.highlightId, saved: options.saved} : range ? onRemember(text, range) : undefined;
    highlightId.current = mark?.id;
    setSelected(text); setPick(null);
    selection?.removeAllRanges();
    if (mark?.saved) {
      controller.current?.abort(); controller.current = null;
      setResult(mark.saved); setStatus('done');
    } else { void explain(text); }
    requestAnimationFrame(() => panel.current?.focus({preventScroll: true}));
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
    {open && createPortal(<section ref={panel} role="dialog" aria-modal="false" tabIndex={-1} aria-label="划线解释" aria-busy={status === 'loading'} onKeyDown={e => {if (e.key === 'Escape') {e.stopPropagation(); close();}}} className="selection-explanation-popover" style={position}>
      <header><strong>划线解释</strong><button type="button" onClick={close} aria-label="关闭解释"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      <blockquote>{selected}</blockquote>
      <div aria-live="polite">
        {status === 'loading' && <p role="status">正在解释…</p>}
        {status === 'error' && <p role="alert">暂时无法解释，请重试。 <button type="button" className="underline" onClick={() => void explain(selected)}>重试</button></p>}
        {result && <>
          <p className="whitespace-pre-wrap">{result.explanation}</p>
          {result.example && <><h4 className="flex items-center gap-1.5">举个例子 <span role="img" aria-label="AI 生成的辅助例子，非作者原例" title="AI 生成的辅助例子，非作者原例" tabIndex={0} className="inline-flex rounded text-[var(--ink-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m10 3 1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8L10 3Z"/><path d="M16 1v4m-2-2h4"/></svg></span></h4><p>{result.example}</p></>}
        </>}
      </div>
    </section>, document.body)}
  </>;
}
