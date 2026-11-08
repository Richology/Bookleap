const el = id => document.getElementById(id);
let toastTimer;
function notify(message) { el('toast').textContent = message; el('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => {el('toast').hidden = true;}, 5000); }
async function invoke(action, value) {
  try { return await window.bookleap.invoke(action, value); }
  catch { notify('操作未完成，请检查目录权限或重试。原有内容不会被重置。'); }
}
async function refresh() {
  const status = await invoke('status'); if (!status) return;
  el('status').textContent = status.paused ? '同步已暂停' : '后台运行中';
  el('statusDot').classList.toggle('paused', status.paused);
  el('bookCount').textContent = `${status.bookCount} 本`;
  el('navCount').textContent = status.bookCount;
  el('sourceCount').textContent = status.sourceCount;
  el('lastSync').textContent = status.lastAcknowledgedAt ? new Date(status.lastAcknowledgedAt).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '尚未同步';
  el('path').textContent = status.path; el('path').title = status.path;
  el('overviewTitle').textContent = status.paused ? '同步已暂停' : status.bookCount ? '你的书库，已保存在本机' : status.sourceCount ? '已连接，等待第一本书' : '准备好接收你的书库';
  el('overviewSubtitle').textContent = status.paused ? '恢复后继续接收新内容，已保存的书籍仍可查询。' : '连接一次，网页拆书结果自动保存到这台电脑。';
  el('pairHint').textContent = status.sourceCount ? `已配对 ${status.sourceCount} 个来源，网页运行时自动同步` : '配对后，开始自动保存你的拆书内容';
  el('pairButton').textContent = status.sourceCount ? '连接新来源' : '连接网页';
  el('pauseButton').textContent = status.paused ? '恢复同步' : '暂停同步';
  el('version').textContent = `书跃本地同步助手 ${status.version}`;
  el('updates').disabled = Boolean(status.unsignedTrial);
  if (status.unsignedTrial) el('updateStatus').textContent = '未签名测试版 · 请从官网下载新版，自动更新已停用。';
  for (const input of document.querySelectorAll('[data-setting]')) input.checked = Boolean(status[input.dataset.setting]);
}
async function showPane(name) {
  for (const pane of document.querySelectorAll('.pane')) pane.hidden = pane.id !== `pane-${name}`;
  for (const button of document.querySelectorAll('nav [data-pane]')) { if(button.dataset.pane === name) {button.setAttribute('aria-current','page'); el('pageTitle').textContent = button.childNodes[1].textContent;} else button.removeAttribute('aria-current'); }
  document.querySelector('.content').scrollTop = 0;
  if (name === 'library') {const result = await invoke('books'); if(result) renderLibrary(result, 'books');}
}
for (const button of document.querySelectorAll('[data-pane]')) button.addEventListener('click', () => showPane(button.dataset.pane));
for (const button of document.querySelectorAll('button[data-action]')) button.addEventListener('click', async () => {
  const action = button.dataset.action; button.disabled = true;
  try {
    const result = await invoke(action);
    if (action === 'connection' && result) {el('connectionConfig').textContent = JSON.stringify(result, null, 2); el('connectionDetails').open = true;}
    else if (action === 'books' && result) renderLibrary(result, action);
    else if (action === 'pair' && typeof result === 'string') {el('pair').textContent = result; el('copyPair').textContent = '复制配对码'; if(!el('pairDialog').open) el('pairDialog').showModal();}
    else if (result !== undefined) {
      let message = typeof result === 'string' ? result : result.state || result.message || '操作已完成';
      if (action === 'test' && result.result?.content?.[0]?.text) {try {message += ` · 可读取 ${JSON.parse(result.result.content[0].text).bookCount} 本书`;} catch { /* Keep SDK status if no count. */ }}
      if (['configure','restore','test'].includes(action)) {el('result').hidden = false; el('result').textContent = message;}
      else if (['update','installUpdate'].includes(action)) el('updateStatus').textContent = message;
      else notify(message);
    }
    await refresh();
  } finally {button.disabled = false;}
});
for (const input of document.querySelectorAll('[data-setting]')) input.addEventListener('change', async () => { input.disabled = true; try {await invoke(input.dataset.setting, input.checked); await refresh();} finally {input.disabled = false;} });
el('closePair').addEventListener('click', () => el('pairDialog').close());
el('donePair').addEventListener('click', () => {el('pairDialog').close(); void refresh();});
el('copyPair').addEventListener('click', async () => {try {await navigator.clipboard.writeText(el('pair').textContent); el('copyPair').textContent = '已复制';} catch {notify('请选中配对码并按 ⌘C 复制。');}});
el('searchForm').addEventListener('submit', async event => {event.preventDefault(); const result = await invoke('search', el('query').value); if(result) renderLibrary(result, 'search');});
void refresh(); setInterval(refresh, 5000);
window.bookleap.onCitation(async id => {await showPane('library'); const result = await invoke('citation', id); if(result) renderLibrary({items:[result]}, 'citation'); else el('library').textContent = '引用已撤销或版本已更新。';});

function renderLibrary(result, action, bookId) {
  const container = el('library'); container.replaceChildren();
  if (!result.items.length) {const empty = document.createElement('div'); empty.className = 'empty'; const title = document.createElement('h2'); title.textContent = action === 'search' ? '没有匹配内容' : '等待你的第一本书'; const note = document.createElement('p'); note.textContent = action === 'search' ? '试试更具体的书名或关键词。' : '回到书跃拆一本书，保存完成后就能在这里看到。'; empty.append(title, note); container.append(empty); return;}
  for (const item of result.items) {
    const card = document.createElement('article');
    const title = document.createElement('h3'); title.textContent = item.title; card.append(title);
    const meta = document.createElement('p'); meta.className = 'meta';
    meta.textContent = `${item.author || '作者未记录'} · ${item.sourceName} · ${item.module || '书籍'} · ${item.contentType === 'personal' ? '个人记录' : item.contentType === 'evidence' ? '已有证据' : '拆书分析'}`; card.append(meta);
    if (item.text) {const text = document.createElement('pre'); text.textContent = item.text; card.append(text);}
    const version = document.createElement('small'); version.textContent = `记录版本 ${item.versionId}`; card.append(version);
    const button = document.createElement('button'); button.textContent = item.citationId ? '核验此引用与证据' : '阅读分析';
    button.addEventListener('click', async () => {
      const result = await invoke(item.citationId ? 'citation' : 'analysis', item.citationId || {bookId:item.bookId});
      if (!result) return;
      if (item.citationId) {
        const evidence = document.createElement('pre'); evidence.textContent = result.evidence || (result.contentType === 'evidence' ? result.text : '此片段没有已保存的原书证据；卡片内容不代表原书页码。'); card.append(evidence); button.disabled = true;
      } else renderLibrary(result, 'analysis', item.bookId);
    });
    card.append(document.createElement('br'), button); container.append(card);
  }
  if (result.nextCursor && action !== 'search') {
    const next = document.createElement('button'); next.textContent = '下一页'; next.addEventListener('click', async () => {const page = await invoke(action, action === 'analysis' ? {bookId, cursor:result.nextCursor} : result.nextCursor); if (page) renderLibrary(page, action, bookId);}); container.append(next);
  }
  if (action === 'search' && result.nextCursor) {const note = document.createElement('p'); note.textContent = '显示前 20 个匹配；请使用更具体的关键词，或通过 MCP 分页读取。'; container.append(note);}
}

el('copyConnection').addEventListener('click', async () => {try {await navigator.clipboard.writeText(el('connectionConfig').textContent); notify('MCP 配置已复制');} catch {notify('请选中配置并复制。');}});
