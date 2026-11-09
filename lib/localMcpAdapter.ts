import { getLocalMcpHistorySnapshot, waitForHistoryMirror } from './workspaceStorage';

const KEY = 'bl-local-mcp-v1'; // Deliberately outside all BookLeap backup prefixes.
const ENDPOINT = 'http://127.0.0.1:48720';
const modules = ['bookSummary', 'readingGuide', 'originalReadingValue', 'viewMap', 'actionExtraction', 'viewValidation', 'ideaSourceTracing', 'bookRecommendation'];
export type LocalMcpConfig = {sourceId: string; sourceName: string; token?: string; personal: boolean; excludedIds: string[]; paused: boolean; signature?: string; revision?: number};
export type LocalMcpStatus = {state: string; message: string; acknowledgedAt?: string | null; count?: number; revision?: number; scope?: {personal: boolean; excludedIds: string[]} | null};
type Fragment = {id: string; module: string; type: 'analysis' | 'personal' | 'evidence'; text: string; evidence?: string};
let extensionReady = false;
let ready = false;
let listener: ((status: LocalMcpStatus) => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let active = false;
export function markLocalMcpHistoryReady() { ready = true; scheduleLocalMcpSync(); }
export function readLocalMcpConfig(): LocalMcpConfig | null {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return null;
    const value = JSON.parse(raw) as LocalMcpConfig;
    if (typeof value.sourceId !== 'string' || typeof value.sourceName !== 'string' || typeof value.personal !== 'boolean' || typeof value.paused !== 'boolean' || !Array.isArray(value.excludedIds) || !value.excludedIds.every(id => typeof id === 'string') || value.token !== undefined && typeof value.token !== 'string') return null;
    return value;
  } catch {return null;}

}
export function resetLocalMcpPairing() { localStorage.removeItem(KEY); scheduleLocalMcpSync(); }
export function updateLocalMcpConfig(patch: Partial<Pick<LocalMcpConfig, 'personal' | 'excludedIds' | 'paused'>>) {
  const config = readLocalMcpConfig(); if (!config) return;
  localStorage.setItem(KEY, JSON.stringify({...config, ...patch, signature: undefined})); scheduleLocalMcpSync();
}
async function request(route: string, config: LocalMcpConfig, body?: unknown) {
  if (extensionReady) {
    const id = crypto.randomUUID();
    return await new Promise<{token?: string; revision: number; acknowledgedAt: string | null; count: number; paused?: boolean; scope: {personal: boolean; excludedIds: string[]} | null}>((resolve, reject) => {
      const timeout = setTimeout(() => {window.removeEventListener('message', receive); reject(new Error('native_host_unavailable'));}, route === '/pair' ? 60000 : 18000);
      const receive = (event: MessageEvent) => {
        if (event.source !== window || event.origin !== location.origin || event.data?.channel !== 'bookleap-local-response' || event.data.id !== id) return;
        clearTimeout(timeout); window.removeEventListener('message', receive);
        if (event.data.response?.status === 200) resolve(event.data.response.body);
        else reject(new Error(event.data.response?.body?.error ?? 'native_host_unavailable'));
      };
      window.addEventListener('message', receive);
      window.postMessage({channel: 'bookleap-local-request', id, request: {route, token: config.token, body}}, location.origin);
    });
  }
  const response = await fetch(`${ENDPOINT}${route}`, {method: body ? 'POST' : 'GET',
    headers: {'Content-Type': 'application/json', 'X-BookLeap-Protocol': '1', ...(config.token ? {Authorization: `Bearer ${config.token}`} : {})},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(route === '/pair' ? 60000 : 15000), cache: 'no-store'});
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? 'connection_interrupted'));
  return result as {token?: string; revision: number; acknowledgedAt: string | null; count: number; paused?: boolean; scope: {personal: boolean; excludedIds: string[]} | null};
}
export async function pairLocalMcp(code: string, sourceName: string) {
  const config: LocalMcpConfig = {sourceId: crypto.randomUUID(), sourceName, personal: false, excludedIds: [], paused: false};
  const result = await request('/pair', config, {schemaVersion: 1, code: code.trim(), sourceId: config.sourceId, sourceName});
  if (!result.token) throw new Error('pairing_failed');
  localStorage.setItem(KEY, JSON.stringify({...config, token: result.token})); scheduleLocalMcpSync();
}
function chunks(text: string, moduleName: string, type: Fragment['type'], evidence?: string): Fragment[] {
  const out: Fragment[] = [];
  for (let offset = 0; offset < text.length; offset += 1400) out.push({id: `${type}-${moduleName}-${String(offset).padStart(9, '0')}`, module: moduleName, type, text: text.slice(offset, offset + 1600), ...(evidence ? {evidence} : {})});
  return out;
}
export async function buildLocalSnapshot(config: LocalMcpConfig, previousCount = 0) {
  const snapshot = await (async () => {
    try {await waitForHistoryMirror(); return await getLocalMcpHistorySnapshot();}
    catch {throw new Error('browser_storage_unavailable');}
  })();
  if (snapshot.records.length === 0 && previousCount > 0 && !snapshot.confirmedEmpty) throw new Error('browser_storage_unavailable');
  const {records} = snapshot;
  const books = records.filter(record => !record.isStarterBook && !config.excludedIds.includes(record.id)).sort((a, b) => a.id.localeCompare(b.id)).map(record => {
    const fragments: Fragment[] = [];
    const evidence = record.cardEvidence && typeof record.cardEvidence === 'object' ? record.cardEvidence as Record<string, unknown> : {};
    for (const moduleName of modules) {
      const text = record[moduleName]; if (typeof text !== 'string' || !text.trim()) continue;
      const existing = evidence[moduleName] ? JSON.stringify(evidence[moduleName]) : undefined;
      // Oversized evidence remains available as separately paginated evidence fragments.
      fragments.push(...chunks(text, moduleName, 'analysis', existing && existing.length <= 12000 ? existing : undefined));
      if (existing) fragments.push(...chunks(existing, moduleName, 'evidence'));
    }
    if (record.analysisContext) fragments.push(...chunks(JSON.stringify(record.analysisContext), 'storedContext', 'evidence'));
    if (config.personal) {
      for (const [prefix, moduleName] of [['bookleap_highlights_v1:', 'cardHighlights'], ['bookleap_reading_reflection:', 'reflection'], ['bookleap_leap_practice:', 'practice'], ['addiction:', 'practiceProgress']]) {
        const value = localStorage.getItem(`${prefix}${record.id}`);
        if (value) { JSON.parse(value); fragments.push(...chunks(value, moduleName, 'personal')); }
      }
    }
    return {sourceRecordId: record.id, title: String(record.title ?? ''), author: String(record.author ?? ''), format: record.fileType, analysisVersion: String(record.createdAt ?? 'legacy'), fragments};
  });
  return {scope: {personal: config.personal, excludedIds: [...config.excludedIds].sort()}, recordCount: books.length, books};
}
export function scheduleLocalMcpSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncLocalMcp(), 1000);
}
const recovery: Record<string, string> = {
  invalid_request: '本地组件拒绝了此批数据，可能存在不支持的格式或过长内容。旧库已保留；请排除问题书籍或升级组件后重试。',
  library_capacity: '本地知识库超过当前 128 MB 上限；旧库已保留，请缩小授权范围后重试。',
  browser_storage_unavailable: '浏览器书库读取失败或已重建，已保留本地旧库。请恢复浏览器书库后重试，或重新配对为新来源。',
  pairing_required: '权限需恢复：请在本地组件重新生成配对码；原来源副本会保留。',
  paused: '本地组件已暂停；你的 Agent 仍可读取最后成功同步内容。',
  upgrade_required: '需升级本地组件；待同步内容仍留在浏览器。',
  revision_conflict: '其他标签页已更新，正在重新读取并同步。',
  snapshot_too_large: '同步内容超出单次 32 MB 上限，请排除部分书籍后重试。',
};
export async function syncLocalMcp() {
  if (!ready || active) return;
  if (!navigator.locks) { listener?.({state: 'unsupported', message: '当前浏览器缺少安全同步锁，请升级浏览器。'}); return; }
  active = true;
  try {
    await navigator.locks.request('bookleap-local-mcp-sync', async () => {
      const config = readLocalMcpConfig();
      if (!config?.token) { listener?.({state: 'unpaired', message: '未安装或未配对'}); return; }
      if (config.paused) { listener?.({state: 'paused', message: '已暂停；你的 Agent 仍可读取最后成功同步内容。'}); return; }
      const local = await request('/status', config);
      if (local.paused) throw new Error('paused');
      const snapshot = await buildLocalSnapshot(config, local.count);
      const signature = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(snapshot)))), b => b.toString(16).padStart(2, '0')).join('');
      if (signature === config.signature && local.revision === config.revision) { listener?.({...local, state: 'synced', message: '已同步'}); return; }
      listener?.({...local, state: 'syncing', message: local.revision ? '待同步，正在写入本地知识库…' : '首次同步…'});
      const ack = await request('/snapshot', config, {schemaVersion: 1, kind: 'complete-snapshot', sourceId: config.sourceId, baseRevision: local.revision, requestId: crypto.randomUUID(), ...snapshot});
      // Preserve a scope change or pause made while the network request was in flight.
      const current = readLocalMcpConfig();
      if (current?.sourceId === config.sourceId && JSON.stringify(current) === JSON.stringify(config)) localStorage.setItem(KEY, JSON.stringify({...config, signature, revision: ack.revision}));
      listener?.({...ack, state: 'synced', message: '已同步'});
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    listener?.({state: code === 'paused' ? 'paused' : 'interrupted', message: recovery[code] ?? '连接中断或权限未授予。请启动本地组件、检查浏览器本地网络权限；页面保持打开后会自动重试。'});
  } finally { active = false; }
}
export function subscribeLocalMcp(callback: (status: LocalMcpStatus) => void) {
  listener = callback;
  const detect = (event: MessageEvent) => {if (event.source === window && event.origin === location.origin && event.data?.channel === 'bookleap-local-ready') extensionReady = true;};
  window.addEventListener('message', detect);
  window.postMessage({channel: 'bookleap-local-detect'}, location.origin);
  const retry = setInterval(() => void syncLocalMcp(), 15000);
  const wake = () => scheduleLocalMcpSync();
  window.addEventListener('storage', wake); window.addEventListener('bookleap-history-saved', wake); window.addEventListener('focus', wake);
  scheduleLocalMcpSync();
  return () => { window.removeEventListener('message', detect); clearInterval(retry); if (timer) clearTimeout(timer); listener = undefined; window.removeEventListener('storage', wake); window.removeEventListener('bookleap-history-saved', wake); window.removeEventListener('focus', wake); };
}
