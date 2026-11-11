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
  const [step, setStep] = useState<'install' | 'pair'>('install');
  const [copied, setCopied] = useState(false);
  const query = '请调用书跃 MCP 列出我的书库，然后选择一本书，概括它的核心观点并标注来源。';
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
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 font-medium text-[var(--accent)]">Chrome 限定试用</span><span className="opacity-60">Mac / Windows · 未签名测试版</span></div>
    {!config?.token && <ol aria-label="配对步骤" className="my-5 grid grid-cols-3 gap-2 text-xs">
      {['下载安装', '配对书库', '连接 Agent'].map((label, index) => <li key={label} aria-current={index === (step === 'install' ? 0 : 1) ? 'step' : undefined} className="flex items-center gap-2"><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--accent)]">{index + 1}</span>{label}</li>)}
    </ol>}
    {config?.token && <div role="status" aria-live="polite" className={`my-4 text-sm ${config?.token ? "rounded-xl border border-[var(--border)] p-3" : "opacity-60"}`}>
      <p>{status.message}</p>
      {status.acknowledgedAt && <p className="mt-1 opacity-70">本地确认：{new Date(status.acknowledgedAt).toLocaleString('zh-CN')} · {status.count} 本 · {status.scope?.personal ? '包含个人记录' : '仅分析与已有证据'}</p>}
    </div>}
    {!config?.token ? <div className="space-y-3 text-sm">
      {step === 'install' ? <div className="rounded-xl border border-[var(--border)] p-3">
        <p className="font-medium">1. 下载并打开同步助手</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="https://github.com/Richology/Bookleap/releases/download/v0.1.0-trial.2/bookleap-sync-0.1.0-trial.2-mac-arm64.dmg" className={`${button} text-center`}>下载 Mac 版<span className="mt-0.5 block text-xs opacity-60">M 系列芯片</span></a>
          <a href="https://github.com/Richology/Bookleap/releases/download/v0.1.0-trial.2/bookleap-sync-0.1.0-trial.2-win-x64.exe" className={`${button} text-center`}>下载 Windows 版<span className="mt-0.5 block text-xs opacity-60">x64</span></a>
        </div>
        <details className="mt-3 text-xs leading-5"><summary className="cursor-pointer">下载后怎么安装？</summary><div className="mt-2 space-y-2 opacity-70"><p>Mac：打开 DMG，将助手拖到「应用程序」，再从「应用程序」打开。仅支持 M 系列芯片。</p><p>Windows：运行 EXE 完成安装，再从开始菜单打开助手。</p><p>此版本未签名。确认来自上述下载入口后，Mac 可在「系统设置 → 隐私与安全性」选择「仍要打开」；Windows 如提供此选项，可选「更多信息 → 仍要运行」。不需要关闭系统防护。</p></div></details>
        <p className="mt-3 text-xs leading-5 opacity-65">无需安装 Node 或其他开发工具。助手已准备默认保存目录，也可以在配对前更改。</p>
        <button className={`${button} mt-3 w-full bg-[var(--accent)] text-white`} onClick={() => setStep('pair')}>已打开助手，下一步</button>
      </div> : <>
      <div className="rounded-xl border border-[var(--border)] p-3"><p className="font-medium">2. 配对这份浏览器书库</p><p className="mt-2 leading-6 opacity-70">在助手中点击「连接网页」，复制配对码并粘贴到下方。提交后，请在助手弹窗中点击「允许此来源」。</p></div>
      <details><summary className="cursor-pointer text-xs opacity-70">书库名称：{name || '我的书跃书库'}（可修改）</summary><label className="mt-2 block">来源名称<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border bg-transparent p-2" placeholder="例如：我的 Chrome 书库" /></label></details>
      <label className="block">配对码<input placeholder="粘贴助手中的配对码" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border bg-transparent p-2" /></label>
      <p className="text-xs leading-5 opacity-65">默认同步拆书分析，不含个人记录。Agent 使用云模型时，查询片段可能进入模型上下文。</p>
      <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />我同意同步，并了解上述数据用途。</label>
      <button disabled={!consent || !code.trim() || !name.trim() || busy} className={`${button} w-full bg-[var(--accent)] text-white`} onClick={async () => {setBusy(true); setError(''); try {await pairLocalMcp(code, name.trim()); setCode(''); setConfig(readLocalMcpConfig());} catch (failure) {const reason = failure instanceof Error ? failure.message : ''; setError(reason === 'pairing_expired' ? '配对码已失效或不正确。请在助手中重新生成，再粘贴重试。' : reason === 'pairing_denied' ? '未获得来源授权。请重新生成配对码，并在助手弹窗中选择「允许此来源」。' : reason === 'invalid_request' ? '配对码格式不正确。请完整复制助手中的配对码，不要输入 MCP 配置。' : '暂时连不上助手。请确认助手正在运行，并允许 Chrome 的本地网络访问。若正在等待来源确认，请先处理助手弹窗，再重新生成配对码重试。');} finally {setBusy(false);}}}>{busy ? '请在助手中确认来源…' : '配对并自动同步'}</button>
      <button className={`${button} w-full`} disabled={busy} onClick={() => setStep('install')}>返回下载安装</button>
      </>}
    </div> : <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-[var(--border)] p-4">
        <h3 className="font-semibold">3. 让你的 Agent 查询书库</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6"><li>打开助手左侧「连接 Agent」。</li><li>使用 Codex？点击「配置 Codex…」并确认。其他 Agent 展开「其他 Agent：手动添加 MCP」，复制配置后添加到客户端的本地 MCP 设置。</li><li>在 Agent 中重新连接 MCP 或重启客户端，然后发送下方问题。</li></ol>
        <p className="mt-3 rounded-lg bg-[var(--accent)]/5 p-3 leading-6">{query}</p>
        <button className={`${button} mt-2 w-full`} onClick={async () => {try {await navigator.clipboard.writeText(query); setCopied(true);} catch {setError('无法自动复制，请选中上方问题手动复制。');}}}>{copied ? '已复制，去 Agent 粘贴' : '复制验收问题'}</button>
        <p className="mt-2 text-xs leading-5 opacity-65">Agent 返回你的真实书名和对应内容，才算连接成功。助手里的「测试连接」只检查本机读取能力。</p>
        {status.state === 'synced' && status.count === 0 && <p className="mt-2 text-xs leading-5 text-[var(--accent)]">已配对，目前没有可同步的书。关闭面板后上传一本自己的书，或导入已有备份；内置体验书不参与同步。完成分析后会自动保存到本机。</p>}
      </div>
      <details><summary className="cursor-pointer">同步设置 · {config.sourceName}</summary><div className="mt-3 space-y-4">
      <p>当前来源：{config.sourceName}</p>
      <label className="flex gap-2"><input type="checkbox" checked={config.personal} onChange={e => patch({personal: e.target.checked})} />同时同步卡片高亮、阅读反思与跃迁练习（可随时撤销）</label>
      <details><summary className="cursor-pointer">选择同步书籍（{books.length - books.filter(b => config.excludedIds.includes(b.id)).length}/{books.length}）</summary><div className="mt-2 max-h-48 space-y-2 overflow-auto">{books.map(book => <label key={book.id} className="flex gap-2"><input type="checkbox" checked={!config.excludedIds.includes(book.id)} onChange={e => patch({excludedIds: e.target.checked ? config.excludedIds.filter(id => id !== book.id) : [...config.excludedIds, book.id]})} />{book.title}</label>)}</div></details>
      <p className="opacity-70">取消授权的内容会在下次同步时移除。暂停期间保留已存内容。</p>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => void syncLocalMcp()}>立即同步</button><button className={button} onClick={() => patch({paused: !config.paused})}>{config.paused ? '恢复自动同步' : '暂停自动同步'}</button></div>
      <button className={button} onClick={() => {resetLocalMcpPairing(); setConfig(null);}}>重新配对（保留旧来源副本）</button>
      </div></details>
      <p className="text-xs leading-5 opacity-70">以后拆书时保持网页和助手运行即可。关闭助手窗口会继续后台同步；退出助手会停止接收新内容。</p>
    </div>}
    <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-xs leading-5">
      <details><summary className="cursor-pointer opacity-70">连接遇到问题？</summary><div className="mt-2 space-y-2 opacity-70"><p>Chrome 提示本地网络访问时，请允许书跃连接助手。曾拒绝可在网站权限中恢复。</p><p>线上与 localhost 需分别配对。配对码五分钟有效，过期后请重新生成；提交后需在助手中确认来源。</p><p>Agent 快捷配置目前仅支持 Codex；其他支持本地 MCP 的客户端需按各自方式配置。本地测试成功不代表 Agent 已连接。</p></div></details>
      <details><summary className="cursor-pointer opacity-70">如何打开助手与保持同步</summary><div className="mt-2 space-y-2 opacity-70"><p>安装后，Mac 从「应用程序」或 Spotlight 搜索「书跃本地同步助手」；Windows 从开始菜单打开。运行时也可点击菜单栏或系统托盘图标。</p><p>网页和助手同时运行即可自动同步，无需打开本面板。关闭助手窗口仍在后台运行；退出或暂停才停止接收。可在助手设置登录自启。</p><p>关闭网页后，Agent 仍能查询已存内容。网页和助手恢复运行后补同步；Agent 在下次查询时读取新内容。</p></div></details>
      <details><summary className="cursor-pointer opacity-70">试用范围与数据说明</summary><div className="mt-2 space-y-2 opacity-70"><p>提供 Mac Apple Silicon 与 Windows x64 未签名测试安装包，仅限桌面 Chrome 试用。不要求预装开发工具，自动更新暂不启用。</p><p>Safari、Edge、Firefox 和 Intel Mac 尚未验收。真实用户书库、多 Agent 兼容、自启与完整卸载保留行为仍在验证；签名分发和自动更新回退不属于本轮。</p><p>本地检索不上传书库或查询。体验书默认排除，个人记录需单独授权；卡片高亮不是原书页码或原文证据。已进入 Agent 对话的内容无法通过清除本地副本撤回。</p></div></details>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </dialog>;
}
