import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {LibraryStore, atomicWrite, assertSafePath, readLibrary} from './store.mjs';
import {Bridge} from './bridge.mjs';
import {queryLibrary, getCitation} from './query.mjs';
import {previewConfig, applyConfig, restoreConfig} from './codex-config.mjs';
import {VERSION} from './protocol.mjs';

// The desktop host owns both ends of these pipes. Web pages only use the paired HTTP bridge.
const [data, documents, mcpScript] = process.argv.slice(2);
const runtime = path.join(data, 'runtime');
const settingsFile = assertSafePath(path.join(data, 'settings.json'));
const configFile = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml');
fs.mkdirSync(data, {recursive: true, mode: 0o700});
const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {parent: documents};
const save = () => atomicWrite(settingsFile, JSON.stringify(settings));
let store, bridge, lastConfig;
let nextId = 0;
const pending = new Map();
const send = message => process.stdout.write(JSON.stringify(message) + '\n');
function native(method, value) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    send({native: method, id, value});
  });
}
function connection() {
  return {command: process.execPath, args: [mcpScript], env: {BOOKLEAP_LIBRARY: store.root, BOOKLEAP_RUNTIME: runtime}};
}
async function start() {
  store = new LibraryStore(settings.parent);
  bridge = new Bridge(store, {
    port: process.env.BOOKLEAP_TEST_HOME ? Number(process.env.BOOKLEAP_TEST_PORT || 48724) : 48720,
    origins: ['https://www.bookleap.cn', ...(settings.preview ? ['http://localhost:3000'] : [])],
    onPair: binding => native('confirm', `允许「${binding.sourceName}」自动同步？\n网页来源：${binding.origin}\n默认仅分析与已有证据；个人内容需网页另行勾选。使用云模型时查询片段可能进入模型上下文。`)
  });
  bridge.paused = Boolean(settings.paused);
  await bridge.listen();
  save();
}
process.on('exit', () => store?.close());
await start();
send({ready: true});
async function dispatch(action, value) {
  switch (action) {
    case 'status': return {path: store.root, paused: bridge.paused, version: VERSION, platform: process.platform === 'win32' ? 'Windows x64' : process.arch === 'arm64' ? 'Apple Silicon Mac' : 'Intel Mac', sourceCount: bridge.pairs.length, lastAcknowledgedAt: store.state.sources.map(s => s.acknowledgedAt).filter(Boolean).sort().at(-1) || null, bookCount: store.state.sources.reduce((n, s) => n + s.books.length, 0), updates: false, unsignedTrial: true, autostart: settings.autostart, preview: Boolean(settings.preview)};
    case 'pair': return bridge.createPairing().code;
    case 'pause': bridge.paused = !bridge.paused; settings.paused = bridge.paused; save(); return bridge.paused ? '已暂停；旧数据仍可查询' : '已恢复接收';
    case 'choose': {
      if (bridge.pairs.length) return '已有配对，请先保留当前目录；迁移已有库尚需专门验证，不能静默切换。';
      const folder = await native('folder');
      if (!folder || folder === settings.parent) return;
      const next = new LibraryStore(folder); next.close();
      await bridge.close(); store.close(); settings.parent = folder; save(); await start(); return '目录已选择';
    }
    case 'preview': if (typeof value !== 'boolean') throw new Error('invalid'); settings.preview = value; bridge.origins = ['https://www.bookleap.cn', ...(value ? ['http://localhost:3000'] : [])]; save(); return;
    case 'autostart': if (typeof value !== 'boolean') throw new Error('invalid'); await native('autostart', value); settings.autostart = value; save(); return;
    case 'updates': case 'update': case 'installUpdate': return '测试版请手动下载更新';
    case 'connection': return {mcpServers: {bookleap: connection()}};
    case 'configure': {
      let preview;
      try {preview = previewConfig(configFile, process.execPath, mcpScript, store.root, runtime, false);}
      catch (error) {return error.code === 'codex_name_conflict' ? 'Codex 已有名为 bookleap 的连接，未覆盖。请在 Codex 检查现有连接，或先手动重命名后再试。' : '无法安全读取或解析 Codex 配置，原文件未改动。请检查目录权限和 TOML 格式。';}
      if (!await native('confirm', `添加 Codex 只读 MCP 连接？\n${configFile}\n${preview.addition}\n将先备份原文件。`)) return '未更改配置';
      try {lastConfig = applyConfig(preview);}
      catch {return '配置在预览后发生变化，或写入失败。未确认安装成功，请重新预览；原文件备份会保留。';}
      return '配置已写入并备份；请在 Codex 重连后调用 library_status。';
    }
    case 'restore': if (!lastConfig) return '本次运行没有可恢复的配置备份'; try {restoreConfig(configFile, lastConfig.backup, lastConfig.writtenHash);} catch {return '配置已有后续修改或无法读取，未覆盖。请手动核对备份：' + lastConfig.backup;} lastConfig = null; return '已恢复；保留备份文件。';
    case 'test': {
      const {Client} = await import('@modelcontextprotocol/sdk/client/index.js');
      const {StdioClientTransport} = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const client = new Client({name: 'bookleap-installer-test', version: VERSION});
      const config = connection();
      const transport = new StdioClientTransport({...config, env: {...process.env, ...config.env}, stderr: 'pipe'});
      try {await client.connect(transport); const result = await client.callTool({name: 'library_status', arguments: {}}); return {state: '实际 SDK stdio 工具测试成功（不等于 Agent 已连接）', result};} finally {await client.close();}
    }
    case 'citation': if (typeof value !== 'string' || value.length > 250) throw new Error('invalid'); return getCitation(readLibrary(store.root), value);
    case 'books': if (value !== undefined && (typeof value !== 'string' || value.length > 2000)) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'list_books', {limit: 20, cursor: value});
    case 'analysis': if (!value || !/^[0-9a-f]{32}$/.test(value.bookId) || value.cursor && (typeof value.cursor !== 'string' || value.cursor.length > 2000)) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'get_book_analysis', {bookId: value.bookId, cursor: value.cursor, limit: 20});
    case 'search': if (typeof value !== 'string' || value.length > 100) throw new Error('invalid'); return queryLibrary(readLibrary(store.root), 'search_library', {query: value, limit: 20});
    case 'clear': {
      if (!await native('confirm', '清除所有本地书库副本和配对？网页原记录将保留。')) return;
      bridge.paused = true;
      atomicWrite(path.join(store.root, 'library.json'), JSON.stringify({schemaVersion: 1, generation: store.state.generation + 1, sources: []}));
      atomicWrite(path.join(store.root, 'pairs.json'), '[]'); bridge.pairs = []; store.state = readLibrary(store.root); bridge.paused = false;
      return '已清除本地副本；重新配对后才能同步。';
    }
    case 'quit': await native('quit'); return;
    default: throw new Error('unknown_action');
  }
}
const input = readline.createInterface({input: process.stdin});
input.on('line', async line => {
  const request = JSON.parse(line);
  if (request.reply !== undefined) {
    const waiter = pending.get(request.reply);
    pending.delete(request.reply);
    if (request.error) waiter?.reject(new Error(request.error));
    else waiter?.resolve(request.value);
    return;
  }
  try {send({id: request.id, value: await dispatch(request.action, request.value ?? undefined)});}
  catch (error) {send({id: request.id, error: String(error.code || 'action_failed')});}
});
input.on('close', () => process.exit(0));
