const {app, BrowserWindow, dialog, ipcMain, Tray, Menu} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
// Display-name changes must not move existing settings, pairings or runtime state.
app.setPath('userData', path.join(app.getPath('appData'), 'bookleap-local-mcp'));
app.setName('书跃本地同步助手');
if (process.argv.includes('--bookleap-test') && process.env.BOOKLEAP_TEST_HOME) {
  app.setPath('userData', path.join(process.env.BOOKLEAP_TEST_HOME, 'app'));
  app.setPath('documents', process.env.BOOKLEAP_TEST_HOME);
}
if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  let window, tray, store, bridge, settings, settingsFile, updates, lastConfig;
  let quitting = false;
  let pendingCitation;
  const receiveUrl = value => {
    try {const url = new URL(value); if (url.protocol !== "bookleap-local:" || url.hostname !== "citation") return; pendingCitation = decodeURIComponent(url.pathname.slice(1)); if (pendingCitation.length > 250) return; show(); window?.webContents.send("citation", pendingCitation);} catch {}
  };
  app.on("open-url", (event, url) => {event.preventDefault(); receiveUrl(url);});
  const show = () => { if (window) {window.show(); window.focus();} };
  app.on('second-instance', (_event, argv) => {show(); const url = argv.find(value => value.startsWith('bookleap-local://')); if (url) receiveUrl(url);});
  app.on('window-all-closed', () => {});
  app.on('activate', show);
  app.on('before-quit', () => {quitting = true; if (store) store.close();});
  app.whenReady().then(async () => {
    const {LibraryStore, atomicWrite, assertSafePath, readLibrary} = await import('./store.mjs');
    const {Bridge} = await import('./bridge.mjs');
    const {queryLibrary, getCitation} = await import('./query.mjs');
    const {previewConfig, applyConfig, restoreConfig} = await import('./codex-config.mjs');
    const {UpdateController} = await import('./update.mjs');
    const {VERSION} = await import('./protocol.mjs');
    const {readersActive} = await import('./runtime.mjs');
    const runtime = path.join(app.getPath('userData'), 'runtime');
    if (!['darwin', 'win32'].includes(process.platform) || !['arm64', 'x64'].includes(process.arch) || process.platform === 'win32' && process.arch !== 'x64') throw new Error('unsupported_platform');
    settingsFile = assertSafePath(path.join(app.getPath('userData'), 'settings.json'));
    fs.mkdirSync(path.dirname(settingsFile), {recursive: true, mode: 0o700});
    settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {parent: app.getPath('documents'), updates: true, autostart: false};
    const save = () => atomicWrite(settingsFile, JSON.stringify(settings));
    const start = async () => {
      store = new LibraryStore(settings.parent);
      bridge = new Bridge(store, {port: process.argv.includes('--bookleap-test') ? Number(process.env.BOOKLEAP_TEST_PORT || 48724) : 48720, origins: ['https://www.bookleap.cn', ...(settings.preview ? ['http://localhost:3000'] : [])], onPair: async binding => {
        const result = await dialog.showMessageBox(window, {type: 'question', title: '确认书跃来源', message: `允许「${binding.sourceName}」自动同步？`, detail: `网页来源：${binding.origin}\n默认仅分析与已有证据；个人内容需网页另行勾选。数据仅写本地，Agent 使用云模型时可能读取查询片段。`, buttons: ['取消', '允许此来源'], defaultId: 0, cancelId: 0});
        return result.response === 1;
      }});
      await bridge.listen();
    };
    await start(); save();
    tray = new Tray(path.join(__dirname, '../ui/trayTemplate.png'));
    tray.setToolTip('书跃本地同步助手');
    tray.setContextMenu(Menu.buildFromTemplate([
      {label: '打开书跃本地同步助手', click: show},
      {label: '暂停 / 恢复接收', click: () => {bridge.paused = !bridge.paused; settings.paused = bridge.paused; save();}},
      {label: '退出助手（停止同步，保留知识库）', click: () => app.quit()},
    ]));
    tray.on('click', show);
    window = new BrowserWindow({width: 980, height: 720, minWidth: 820, minHeight: 600, backgroundColor: '#f5f5f7', ...(process.platform === 'darwin' ? {titleBarStyle: 'hiddenInset', trafficLightPosition: {x: 18, y: 19}} : {}), show: true, webPreferences: {preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true}});
    window.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.on('close', event => {if (!quitting) {event.preventDefault(); window.hide();}});
    const unsignedTrial = Boolean(require(path.join(app.getAppPath(), 'package.json')).bookleapUnsignedTrial);
    if (unsignedTrial) {settings.updates = false; save();}
    const releaseFile = path.join(app.getAppPath(), 'release-config.json');
    const release = app.isPackaged && fs.existsSync(releaseFile) ? JSON.parse(fs.readFileSync(releaseFile, 'utf8')) : null;
    updates = new UpdateController(require('electron-updater').autoUpdater, release, {busy: () => bridge.activeRequests > 0 || readersActive(runtime)});
    const configFile = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml');
    ipcMain.handle('bookleap', async (event, action, value) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('denied');
      switch (action) {
        case 'status': return {path: store.root, paused: bridge.paused, version: VERSION, platform: process.platform === 'win32' ? 'Windows x64' : process.arch === 'arm64' ? 'Apple Silicon Mac' : 'Intel Mac', sourceCount: bridge.pairs.length, lastAcknowledgedAt: store.state.sources.map(s => s.acknowledgedAt).filter(Boolean).sort().at(-1) || null, bookCount: store.state.sources.reduce((n, s) => n + s.books.length, 0), updates: settings.updates, unsignedTrial, autostart: settings.autostart, preview: Boolean(settings.preview)};
        case 'pair': return bridge.createPairing().code;
        case 'pause': bridge.paused = !bridge.paused; settings.paused = bridge.paused; save(); return bridge.paused ? '已暂停；旧数据仍可查询' : '已恢复接收';
        case 'choose': {
          if (bridge.pairs.length) return '已有配对，请先保留当前目录；迁移已有库尚需专门验证，不能静默切换。';
          const result = await dialog.showOpenDialog(window, {properties: ['openDirectory', 'createDirectory']});
          if (result.canceled) return;
          const next = new LibraryStore(result.filePaths[0]); next.close();
          await bridge.close(); store.close(); settings.parent = result.filePaths[0]; save(); await start(); return '目录已选择';
        }
        case 'preview': if (typeof value !== 'boolean') throw new Error('invalid'); settings.preview = value; bridge.origins = ['https://www.bookleap.cn', ...(value ? ['http://localhost:3000'] : [])]; save(); return;
        case 'autostart': if (typeof value !== 'boolean') throw new Error('invalid'); settings.autostart = value; app.setLoginItemSettings({openAtLogin: value, path: process.execPath}); save(); return;
        case 'updates': if (unsignedTrial) return '测试版请手动下载更新'; if (typeof value !== 'boolean') throw new Error('invalid'); settings.updates = value; save(); return;
        case 'connection': return {mcpServers: {bookleap: {command: process.execPath, args: [path.join(app.getAppPath(), 'src/mcp.mjs')], env: {ELECTRON_RUN_AS_NODE: '1', BOOKLEAP_LIBRARY: store.root, BOOKLEAP_RUNTIME: runtime}}}};
        case 'configure': {
          let preview;
          try {preview = previewConfig(configFile, process.execPath, path.join(app.getAppPath(), 'src/mcp.mjs'), store.root, runtime);}
          catch (error) {return error.code === 'codex_name_conflict' ? 'Codex 已有名为 bookleap 的连接，未覆盖。请在 Codex 检查现有连接，或先手动重命名后再试。' : '无法安全读取或解析 Codex 配置，原文件未改动。请检查目录权限和 TOML 格式。';}
          const result = await dialog.showMessageBox(window, {type: 'question', message: '添加 Codex 只读 MCP 连接？', detail: `${configFile}\n${preview.addition}\n会先备份原文件；不代表 Codex 已连接。`, buttons: ['取消', '确认添加'], defaultId: 0, cancelId: 0});
          if (result.response !== 1) return '未更改配置';
          try {lastConfig = applyConfig(preview);}
          catch {return '配置在预览后发生变化，或写入失败。未确认安装成功，请重新预览；原文件备份会保留。';}
          return '配置已写入并备份；请在 Codex 重连后调用 library_status。';
        }
        case 'restore': if (!lastConfig) return '本次运行没有可恢复的配置备份'; try {restoreConfig(configFile, lastConfig.backup, lastConfig.writtenHash);} catch {return '配置已有后续修改或无法读取，未覆盖。请手动核对备份：' + lastConfig.backup;} lastConfig = null; return '已恢复；保留备份文件。';
        case 'test': {
          const {Client} = await import('@modelcontextprotocol/sdk/client/index.js');
          const {StdioClientTransport} = await import('@modelcontextprotocol/sdk/client/stdio.js');
          const client = new Client({name: 'bookleap-installer-test', version: VERSION});
          const transport = new StdioClientTransport({command: process.execPath, args: [path.join(app.getAppPath(), 'src/mcp.mjs')], env: {...process.env, ELECTRON_RUN_AS_NODE: '1', BOOKLEAP_LIBRARY: store.root, BOOKLEAP_RUNTIME: runtime}, stderr: 'pipe'});
          try {await client.connect(transport); const result = await client.callTool({name: 'library_status', arguments: {}}); return {state: '实际 SDK stdio 工具测试成功（不等于 Agent 已连接）', result};} finally {await client.close();}
        }
        case 'citation': if (typeof value !== 'string' || value.length > 250) throw new Error('invalid'); return getCitation(readLibrary(store.root), value);
        case 'books': if (value !== undefined && (typeof value !== 'string' || value.length > 2000)) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'list_books', {limit: 20, cursor: value});
        case 'analysis': if (!value || !/^[0-9a-f]{32}$/.test(value.bookId) || value.cursor && (typeof value.cursor !== 'string' || value.cursor.length > 2000)) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'get_book_analysis', {bookId: value.bookId, cursor: value.cursor, limit: 20});
        case 'search': if (typeof value !== 'string' || value.length > 100) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'search_library', {query: value, limit: 20});
        case 'update': return await updates.check();
        case 'installUpdate': return updates.install();
        case 'clear': {
          const result = await dialog.showMessageBox(window, {type: 'warning', message: '清除所有本地书库副本和配对？', detail: '不会删除浏览器原记录或其他文件。已进入 Agent 对话的内容不能撤回。', buttons: ['取消', '清除'], defaultId: 0, cancelId: 0});
          if (result.response !== 1) return;
          bridge.paused = true;
          atomicWrite(path.join(store.root, 'library.json'), JSON.stringify({schemaVersion: 1, generation: store.state.generation + 1, sources: []}));
          atomicWrite(path.join(store.root, 'pairs.json'), '[]'); bridge.pairs = []; store.state = readLibrary(store.root); bridge.paused = false;
          return '已清除本地副本；重新配对后才能同步。';
        }
        case 'quit': app.quit(); return;
        default: throw new Error('unknown_action');
      }
    });
    bridge.paused = Boolean(settings.paused);
    await window.loadFile(path.join(__dirname, '../ui/index.html'));
    if (pendingCitation) window.webContents.send('citation', pendingCitation);
    if (settings.updates) void updates.check();
    setInterval(() => {if (settings.updates) void updates.check();}, 6 * 3600000).unref();
    setInterval(() => {if (settings.updates && updates.downloaded && !updates.busy()) updates.install();}, 60000).unref();
  }).catch(() => {dialog.showErrorBox('书跃本地同步助手未启动', '请检查目录权限、是否已有接收进程、端口 48720 是否被占用。原有数据未重置。'); app.quit();});
}
