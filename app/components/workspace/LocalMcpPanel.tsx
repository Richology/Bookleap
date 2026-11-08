"use client";
import { useEffect, useRef, useState } from 'react';
import { pairLocalMcp, readLocalMcpConfig, resetLocalMcpPairing, subscribeLocalMcp, syncLocalMcp, updateLocalMcpConfig, type LocalMcpConfig, type LocalMcpStatus } from '@/lib/localMcpAdapter';

export default function LocalMcpPanel({open, onClose, books}: {open: boolean; onClose: () => void; books: {id: string; title: string}[]}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<LocalMcpStatus>({state: 'unpaired', message: '未安装或未配对'});
  const [config, setConfig] = useState<LocalMcpConfig | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('我的书跃书库');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => subscribeLocalMcp(value => {setStatus(previous => ({...previous, ...value})); setConfig(readLocalMcpConfig());}), []);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const patch = (value: Parameters<typeof updateLocalMcpConfig>[0]) => {updateLocalMcpConfig(value); setConfig(readLocalMcpConfig());};
  const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40';
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} className="m-auto max-h-[85vh] w-[min(560px,92vw)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 text-[var(--ink)] shadow-xl backdrop:bg-black/30">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">本地 MCP</h2><button onClick={onClose} className={button} aria-label="关闭本地 MCP">关闭</button></div>
    <p className="mt-2 text-sm opacity-70">拆书内容自动存到电脑，供你的 Agent 查询。</p>
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 font-medium text-[var(--accent)]">Chrome 限定试用</span><span className="opacity-60">Apple Silicon Mac · 需已有助手试用包</span></div>
    {!config?.token && <ol aria-label="配对步骤" className="my-5 grid grid-cols-3 gap-2 text-xs">
      {['打开助手', '填写配对码', '确认连接'].map((step, index) => <li key={step} className="flex items-center gap-2"><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--accent)]">{index + 1}</span>{step}</li>)}
    </ol>}
    <div role="status" aria-live="polite" className={`my-4 text-sm ${config?.token ? "rounded-xl border border-[var(--border)] p-3" : "opacity-60"}`}>
      <p>{status.message}</p>
      {status.acknowledgedAt && <p className="mt-1 opacity-70">本地确认：{new Date(status.acknowledgedAt).toLocaleString('zh-CN')} · {status.count} 本 · {status.scope?.personal ? '包含个人记录' : '仅分析与已有证据'}</p>}
    </div>
    {!config?.token ? <div className="space-y-3 text-sm">
      <div className="rounded-xl border border-[var(--border)] p-3"><p className="font-medium">在助手中生成配对码</p><p className="mt-1 text-xs leading-5 opacity-65">打开「书跃本地同步助手」，选好保存目录，点击「连接网页」。</p><p className="mt-2 text-xs opacity-65">还没有助手？试用包暂未开放下载。</p></div>
      <label className="block">来源名称<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border bg-transparent p-2" placeholder="例如：我的 Chrome 书库" /></label>
      <label className="block">配对码<input placeholder="粘贴助手中的配对码" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border bg-transparent p-2" /></label>
      <p className="text-xs leading-5 opacity-65">默认同步拆书分析，不含个人记录。Agent 使用云模型时，查询片段可能进入模型上下文。</p>
      <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />我同意同步，并了解上述数据用途。</label>
      <button disabled={!consent || !code || !name.trim() || busy} className={`${button} w-full bg-[var(--accent)] text-white`} onClick={async () => {setBusy(true); setError(''); try {await pairLocalMcp(code, name.trim()); setCode(''); setConfig(readLocalMcpConfig());} catch {setError('配对未完成。请检查组件与浏览器本地网络权限，重新生成配对码，并在本地组件确认来源。');} finally {setBusy(false);}}}>{busy ? '请在助手中确认来源…' : '配对并自动同步'}</button>
    </div> : <div className="space-y-4 text-sm">
      <p>当前来源：{config.sourceName}</p>
      <label className="flex gap-2"><input type="checkbox" checked={config.personal} onChange={e => patch({personal: e.target.checked})} />同时同步卡片高亮、阅读反思与跃迁练习（可随时撤销）</label>
      <details><summary className="cursor-pointer">选择同步书籍（{books.length - books.filter(b => config.excludedIds.includes(b.id)).length}/{books.length}）</summary><div className="mt-2 max-h-48 space-y-2 overflow-auto">{books.map(book => <label key={book.id} className="flex gap-2"><input type="checkbox" checked={!config.excludedIds.includes(book.id)} onChange={e => patch({excludedIds: e.target.checked ? config.excludedIds.filter(id => id !== book.id) : [...config.excludedIds, book.id]})} />{book.title}</label>)}</div></details>
      <p className="opacity-70">取消授权的内容会在下次同步时移除。暂停期间保留已存内容。</p>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => void syncLocalMcp()}>立即同步</button><button className={button} onClick={() => patch({paused: !config.paused})}>{config.paused ? '恢复自动同步' : '暂停自动同步'}</button></div>
      <button className={button} onClick={() => {resetLocalMcpPairing(); setConfig(null);}}>重新配对（保留旧来源副本）</button>
      <p className="opacity-70">下一步：在助手的「连接 Agent」中配置你的客户端。</p>
    </div>}
    <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-xs leading-5">
      <details><summary className="cursor-pointer opacity-70">连接遇到问题？</summary><div className="mt-2 space-y-2 opacity-70"><p>Chrome 提示本地网络访问时，请允许书跃连接助手。曾拒绝可在网站权限中恢复。</p><p>线上与 localhost 需分别配对。配对码五分钟有效，过期后请重新生成；提交后需在助手中确认来源。</p><p>Agent 快捷配置目前仅支持 Codex；其他支持本地 MCP 的客户端需按各自方式配置。本地测试成功不代表 Agent 已连接。</p></div></details>
      <details><summary className="cursor-pointer opacity-70">如何打开助手与保持同步</summary><div className="mt-2 space-y-2 opacity-70"><p>试用包从保存的 .app 位置打开；运行时点击菜单栏图标。正式安装后可从「应用程序」或 Spotlight 搜索助手名称；Windows 从开始菜单打开。</p><p>网页和助手同时运行即可自动同步，无需打开本面板。关闭助手窗口仍在后台运行；退出或暂停才停止接收。可在助手设置登录自启。</p><p>关闭网页后，Agent 仍能查询已存内容。网页和助手恢复运行后补同步；Agent 在下次查询时读取新内容。</p></div></details>
      <details><summary className="cursor-pointer opacity-70">试用范围与数据说明</summary><div className="mt-2 space-y-2 opacity-70"><p>仅供已有 Apple Silicon Mac 助手开发包的桌面 Chrome 用户试用，暂无正式安装包下载。</p><p>Safari、Edge、Firefox、Windows 和 Intel Mac 尚未验收。签名分发、更新安装与回退、自启及卸载仍待验证；真实书库与 Agent 连接正在试用验收中。</p><p>本地检索不上传书库或查询。体验书默认排除，个人记录需单独授权；卡片高亮不是原书页码或原文证据。已进入 Agent 对话的内容无法通过清除本地副本撤回。</p></div></details>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </dialog>;
}
