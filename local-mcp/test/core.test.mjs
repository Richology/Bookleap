import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID, generateKeyPairSync, sign} from 'node:crypto';
import {LibraryStore, readLibrary} from '../src/store.mjs';
import {queryLibrary} from '../src/query.mjs';
import {Bridge} from '../src/bridge.mjs';
import {previewConfig, applyConfig, restoreConfig} from '../src/codex-config.mjs';
import {verifyManifest, matchRelease, UpdateController} from '../src/update.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
const fixture = t => {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'bookleap-test-'));
  const store = new LibraryStore(parent);
  t.after(() => {store.close(); fs.rmSync(parent, {recursive: true, force: true});});
  return {store, parent};
};
const source = () => ({sourceId: randomUUID(), sourceName: '合成 Safari', origin: 'https://www.bookleap.cn'});
const book = (id = 'record-1') => ({sourceRecordId: id, title: '合成决策书', author: '测试作者', format: 'epub', analysisVersion: 'v1', fragments: [{id: 'analysis-summary-0', module: 'bookSummary', type: 'analysis', text: '长期主义与决策，复利需要耐心。'}]});
const snap = (binding, revision = 0, books = [book()]) => ({schemaVersion: 1, kind: 'complete-snapshot', sourceId: binding.sourceId, baseRevision: revision, requestId: randomUUID(), scope: {personal: false, excludedIds: []}, recordCount: books.length, books});
test('atomic persistence, idempotent retry, CAS ordering and rejected partial snapshot', t => {
  const {store} = fixture(t), binding = source(), request = snap(binding);
  const first = store.commit(request, binding);
  assert.equal(store.commit(request, binding).revision, first.revision);
  assert.throws(() => store.commit({...request, recordCount: 0}, binding));
  assert.throws(() => store.commit(snap(binding), binding), /revision_conflict/);
  assert.throws(() => store.commit({...snap(binding, 1), books: []}, binding));
  assert.equal(readLibrary(store.root).sources[0].books.length, 1);
  store.commit(snap(binding, 1, []), binding);
  assert.equal(readLibrary(store.root).sources[0].books.length, 0);
});
test('source isolation, duplicate titles, scope revocation and evidence honesty', t => {
  const {store} = fixture(t), safari = source(), chrome = source();
  const value = snap(safari); value.scope.personal = true;
  value.books[0].fragments.push({id: 'personal-1', module: 'reflection', type: 'personal', text: '秘密反思'});
  store.commit(value, safari); store.commit(snap(chrome), chrome);
  const before = queryLibrary(store.state, 'list_books'); assert.equal(before.items.length, 2);
  assert.notEqual(before.items[0].bookId, before.items[1].bookId);
  store.commit(snap(safari, 1), safari);
  assert.equal(queryLibrary(store.state, 'search_library', {query: '秘密'}).items.length, 0);
  store.commit(snap(chrome, 1, []), chrome);
  assert.equal(queryLibrary(store.state, 'list_books').items.length, 1);
  const match = queryLibrary(store.state, 'search_library', {query: '长期主义'}).items[0];
  assert.equal(queryLibrary(store.state, 'get_evidence', {citationId: match.citationId}).evidenceUnavailable, true);
  assert.throws(() => store.commit(snap(safari, 2), chrome), /source_mismatch/);
});
test('Chinese literal search, stable pagination, stale cursor, bounded output and large library', t => {
  const {store} = fixture(t), binding = source();
  const books = Array.from({length: 1000}, (_, i) => book(`record-${i}`));
  store.commit(snap(binding, 0, books), binding);
  const first = queryLibrary(store.state, 'search_library', {query: '决策', limit: 20});
  assert.equal(first.items.length, 20); assert.ok(first.nextCursor);
  const second = queryLibrary(store.state, 'search_library', {query: '决策', limit: 20, cursor: first.nextCursor});
  assert.ok(!second.items.some(item => first.items.some(a => a.citationId === item.citationId)));
  assert.ok(JSON.stringify(first).length < 50000);
  assert.equal(queryLibrary(store.state, 'search_library', {query: '不存在词'}).noMatches, true);
  store.commit(snap(binding, 1), binding);
  assert.throws(() => queryLibrary(store.state, 'search_library', {query: '决策', limit: 20, cursor: first.nextCursor}), /cursor_expired/);
});
test('stale process lock and staged crash files recover without replacing committed state', t => {
  const {store, parent} = fixture(t), binding = source(); store.commit(snap(binding), binding); store.close();
  fs.writeFileSync(path.join(store.root, '.writer-lock'), '2147483647');
  const staged = path.join(store.root, `library.json.${randomUUID()}.tmp`); fs.writeFileSync(staged, '{');
  const recovered = new LibraryStore(parent);
  assert.equal(recovered.state.sources[0].books.length, 1); assert.equal(fs.existsSync(staged), false); recovered.close();
});
test('reject unmanaged directories and symlink escape', t => {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'bookleap-path-')); t.after(() => fs.rmSync(parent, {recursive: true, force: true}));
  fs.mkdirSync(path.join(parent, 'BookLeapLibrary')); fs.writeFileSync(path.join(parent, 'BookLeapLibrary', 'private.txt'), 'keep');
  assert.throws(() => new LibraryStore(parent), /directory_not_owned/);
  fs.symlinkSync(parent, path.join(parent, 'alias'));
  assert.throws(() => new LibraryStore(path.join(parent, 'alias')), /symlink_not_allowed/);
});
test('Codex config preserves comments, refuses races and same-name conflicts, restores safely', t => {
  const {parent} = fixture(t), file = path.join(parent, 'config.toml');
  const original = '# user comment\nmodel = "existing-model"\n[mcp_servers.other]\ncommand = "other"\n'; fs.writeFileSync(file, original);
  const preview = previewConfig(file, '/app/electron', '/app/mcp.mjs', '/library');
  const applied = applyConfig(preview); assert.ok(fs.readFileSync(file, 'utf8').startsWith(original));
  assert.throws(() => previewConfig(file, '/app', '/script', '/library'), /codex_name_conflict/);
  restoreConfig(file, applied.backup, applied.writtenHash); assert.equal(fs.readFileSync(file, 'utf8'), original);
  const raced = previewConfig(file, '/app', '/script', '/library'); fs.appendFileSync(file, '\n# changed');
  assert.throws(() => applyConfig(raced), /changed_preview/);
});
test('HTTPS-origin bridge pairing, auth, pause and real snapshot acknowledgement', async t => {
  const {store} = fixture(t); const bridge = new Bridge(store, {port: 0, onPair: async () => true}); await bridge.listen(); t.after(() => bridge.close());
  const origin = 'https://www.bookleap.cn'; const url = `http://127.0.0.1:${bridge.port}`;
  const headers = {'Origin': origin, 'Content-Type': 'application/json', 'X-BookLeap-Protocol': '1'};
  assert.equal((await fetch(url + '/status', {headers})).status, 401);
  assert.equal((await fetch(url + '/status', {headers: {...headers, Origin: 'https://evil.example'}})).status, 403);
  const binding = source(), code = bridge.createPairing().code;
  const paired = await fetch(url + '/pair', {method: 'POST', headers, body: JSON.stringify({schemaVersion: 1, sourceId: binding.sourceId, sourceName: binding.sourceName, code})});
  const {token} = await paired.json(); assert.ok(token);
  const authenticated = {...headers, Authorization: `Bearer ${token}`};
  const saved = await fetch(url + '/snapshot', {method: 'POST', headers: authenticated, body: JSON.stringify(snap(binding))});
  assert.equal((await saved.json()).revision, 1);
  bridge.paused = true;
  assert.equal((await fetch(url + '/snapshot', {method: 'POST', headers: authenticated, body: JSON.stringify(snap(binding, 1))})).status, 423);
  const rejected = await new Promise(resolve => { const request = http.request(url + '/status', {headers: {...authenticated, Host: 'evil.example'}}, response => {response.resume(); resolve(response.statusCode);}); request.end(); });
  assert.equal(rejected, 403);
});
test('actual official SDK stdio lists only read-only tools after receiver is closed', async t => {
  const {store} = fixture(t); const binding = source(); store.commit(snap(binding), binding); store.close();
  const client = new Client({name: 'test', version: '1'});
  const transport = new StdioClientTransport({command: process.execPath, args: [path.resolve('src/mcp.mjs')], env: {BOOKLEAP_LIBRARY: store.root}, stderr: 'pipe'});
  try {
    await client.connect(transport);
    const listed = await client.listTools(); assert.equal(listed.tools.length, 5); assert.ok(listed.tools.every(tool => tool.annotations.readOnlyHint));
    const response = await client.callTool({name: 'search_library', arguments: {query: '复利'}});
    assert.equal(JSON.parse(response.content[0].text).items.length, 1);
  } finally {await client.close();}
});
test('trusted update rejects tamper, wrong platform, expired manifests and schema migration', () => {
  const {publicKey, privateKey} = generateKeyPairSync('ed25519');
  const config = {publicKey, feedUrl: 'https://updates.example.test/bookleap/'};
  const manifest = {schemaVersion: 1, librarySchema: 1, platform: 'darwin', arch: 'arm64', version: '0.1.1', expiresAt: Date.now() + 60000, files: [{url: 'app.zip', sha512: Buffer.alloc(64).toString('base64')}]};
  const envelope = value => {const payload = JSON.stringify(value); return {payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64')};};
  assert.equal(verifyManifest(envelope(manifest), config, 'darwin', 'arm64').version, '0.1.1');
  assert.throws(() => verifyManifest({...envelope(manifest), payload: '{}'}, config, 'darwin', 'arm64'), /signature/);
  assert.throws(() => verifyManifest(envelope(manifest), config, 'win32', 'x64'), /platform/);
  assert.throws(() => verifyManifest(envelope({...manifest, expiresAt: 0}), config, 'darwin', 'arm64'), /expired/);
  assert.throws(() => verifyManifest(envelope({...manifest, librarySchema: 2}), config, 'darwin', 'arm64'), /schema/);
  assert.throws(() => matchRelease({version: '0.1.1', files: []}, manifest), /metadata/);
  const fake = new EventEmitter(); fake.quitAndInstall = () => assert.fail('must defer');
  const controller = new UpdateController(fake, config, {busy: () => true}); controller.downloaded = true;
  assert.match(controller.install(), /延期/);
});

test('process crash before atomic rename retains last committed generation', t => {
  const {store, parent} = fixture(t), binding = source(); store.commit(snap(binding), binding); store.close();
  const script = `import fs from 'node:fs'; import {LibraryStore} from './src/store.mjs'; const store = new LibraryStore(process.argv[1]); fs.renameSync = () => process.exit(42); store.commit(JSON.parse(process.argv[2]), JSON.parse(process.argv[3]));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, parent, JSON.stringify(snap(binding, 1, [])), JSON.stringify(binding)]);
  assert.equal(child.status, 42);
  const recovered = new LibraryStore(parent); assert.equal(recovered.state.sources[0].books.length, 1); recovered.close();
});
test('update download failure leaves installed version and never runs installer', async () => {
  const fake = new EventEmitter(); fake.quitAndInstall = () => assert.fail('must not install');
  const controller = new UpdateController(fake, {manifestUrl:'http://not-https.invalid'});
  assert.match(await controller.check(), /失败/); assert.equal(controller.downloaded, false);
  assert.match(controller.install(), /尚无/);
});
