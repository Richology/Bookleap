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
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--accent)]/5 p-3 text-sm leading-6"><strong>Chrome 限定试用</strong><p>本轮供已持有 Mac Apple Silicon 版「书跃本地同步助手」的用户，在桌面 Chrome 中体验。正式安装包暂未开放下载。</p><p className="mt-1 opacity-70">Safari、Edge、Firefox、Windows 与 Intel Mac 尚未完成本轮验收。签名分发、自动更新安装与回退、自启及卸载仍待验证；真实书库与 Agent 连接正在试用验收中。</p></div>
    <p className="mt-4 text-sm leading-6">首次安装并配对后，网页会自动把已授权拆书内容同步到这台电脑。关闭浏览器后，你的 Agent 仍可查询最后成功同步的内容。</p>
    <p className="mt-2 text-sm leading-6 opacity-70">本地检索不上传书库或查询。Agent 使用云模型时，读取的片段可能进入模型上下文。体验书默认排除；卡片高亮不是原书页码或原文证据。</p>
    <details open={!config?.token} className="mt-4 text-sm leading-6">
      <summary className="cursor-pointer font-medium">助手如何运行、安装后从哪里打开</summary>
      <div className="mt-2 space-y-2 opacity-80">
        <p>首次配对后，拆书时保持书跃网页和「书跃本地同步助手」运行，新内容就会自动保存。无需每次打开本面板或点击「立即同步」。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>关闭助手窗口：隐藏到后台，继续同步。</li>
          <li>退出助手或暂停同步：新内容暂时不会写入目录。网页与助手再次运行并恢复同步后，会自动补传。</li>
          <li>关闭书跃网页：停止发送。已经成功同步的内容，你的 Agent 仍可通过 MCP 查询，助手不必继续运行。</li>
        </ul>
        <p>可在助手中自行勾选「登录电脑后自动启动」。Agent 在下次查询时读取已同步的新内容，不会自动刷新之前的回答。</p>
        <p>正式安装后，Mac 从「应用程序」或 Spotlight 搜索「书跃本地同步助手」打开；Windows 从开始菜单搜索同名应用。运行时也可点击 Mac 菜单栏或 Windows 系统托盘图标打开窗口。本机试用包请从保存的 .app 位置打开。</p>
      </div>
    </details>
    <div role="status" aria-live="polite" className="my-4 rounded-xl border border-[var(--border)] p-3 text-sm">
      <p>{status.message}</p>
      {status.acknowledgedAt && <p className="mt-1 opacity-70">本地确认：{new Date(status.acknowledgedAt).toLocaleString('zh-CN')} · {status.count} 本 · {status.scope?.personal ? '包含个人记录' : '仅分析与已有证据'}</p>}
    </div>
    {!config?.token ? <div className="space-y-3 text-sm">
      <p className="opacity-70">先打开已有的「书跃本地同步助手」试用包，选择知识库位置，再生成配对码。线上书库需单独配对，本机 localhost 的配对不会迁移到线上。Chrome 如提示本地网络访问，请允许书跃连接助手；被拒绝时可在网站权限中恢复后重试。</p>
      <label className="block">来源名称<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border bg-transparent p-2" placeholder="例如：Mac Safari 书库" /></label>
      <label className="block">本地组件显示的配对码<input value={code} onChange={e => setCode(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border bg-transparent p-2" /></label>
      <label className="flex gap-2"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />我同意同步自己的拆书内容，并了解模型侧的数据流向。</label>
      <button disabled={!consent || !code || !name.trim() || busy} className={button} onClick={async () => {setBusy(true); setError(''); try {await pairLocalMcp(code, name.trim()); setCode(''); setConfig(readLocalMcpConfig());} catch {setError('配对未完成。请检查组件与浏览器本地网络权限，重新生成配对码，并在本地组件确认来源。');} finally {setBusy(false);}}}>配对并自动同步</button>
    </div> : <div className="space-y-4 text-sm">
      <p>当前来源：{config.sourceName}</p>
      <label className="flex gap-2"><input type="checkbox" checked={config.personal} onChange={e => patch({personal: e.target.checked})} />同时同步卡片高亮、阅读反思与跃迁练习（可随时撤销）</label>
      <details><summary className="cursor-pointer">选择同步书籍（{books.length - books.filter(b => config.excludedIds.includes(b.id)).length}/{books.length}）</summary><div className="mt-2 max-h-48 space-y-2 overflow-auto">{books.map(book => <label key={book.id} className="flex gap-2"><input type="checkbox" checked={!config.excludedIds.includes(book.id)} onChange={e => patch({excludedIds: e.target.checked ? config.excludedIds.filter(id => id !== book.id) : [...config.excludedIds, book.id]})} />{book.title}</label>)}</div></details>
      <p className="opacity-70">排除或撤销后，下次成功同步会移除本地对应副本。暂停期间保留旧内容。浏览器关闭前未送达的更新会在重新打开后补传。</p>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => void syncLocalMcp()}>立即同步</button><button className={button} onClick={() => patch({paused: !config.paused})}>{config.paused ? '恢复自动同步' : '暂停自动同步'}</button></div>
      <button className={button} onClick={() => {resetLocalMcpPairing(); setConfig(null);}}>重新配对（保留旧来源副本）</button>
      <p className="opacity-70">请在本地同步助手的「连接 Agent」中查看连接说明，并在你的 Agent 中配置 MCP。当前快捷配置仅支持 Codex；其他支持本地 MCP 的 Agent 需按各自方式配置。配置写入或本地测试成功，不代表 Agent 已连接。</p>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </dialog>;
}
