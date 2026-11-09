import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { archiveOne, checkLifecycle } from './archive-blobs.mjs';
import { canParseBlob, canArchiveBlob, ownedBlobUrl, BLOB_PARSE_MAX_AGE_MS, BLOB_ARCHIVE_MIN_AGE_MS } from '../lib/blobLifecycle.mjs';

const now = Date.parse('2026-11-09T12:00:00Z');
const data = Buffer.from('合成测试书籍，不是真实用户数据。');
const blob = { url: 'https://example.public.blob.vercel-storage.com/uploads/book.txt', pathname: 'uploads/book.txt', size: data.length, etag: '"v1"', uploadedAt: new Date(now - 25 * 3600_000) };
async function fixture(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bookleap-archive-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const deleted = [];
  return { root, deleted, options: { root, now, remove: true, fetchBlob: async () => new Response(data, { headers: { etag: blob.etag } }), headBlob: async () => blob, deleteBlob: async (url, options) => deleted.push({ url, options }), ...overrides } };
}

test('parsing and archive windows never overlap, including 300-second in-flight parser', () => {
  assert.equal(canParseBlob(new Date(now - BLOB_PARSE_MAX_AGE_MS + 1), now), true);
  assert.equal(canParseBlob(new Date(now - BLOB_PARSE_MAX_AGE_MS), now), false);
  assert.equal(canArchiveBlob(new Date(now - BLOB_ARCHIVE_MIN_AGE_MS + 1), now), false);
  assert.equal(canArchiveBlob(new Date(now - BLOB_ARCHIVE_MIN_AGE_MS), now), true);
  assert.ok(BLOB_ARCHIVE_MIN_AGE_MS - BLOB_PARSE_MAX_AGE_MS > 300_000);
  for (const time of ['invalid', new Date(now + 1000)]) {
    assert.equal(canArchiveBlob(time, now), false);
    assert.equal(canParseBlob(time, now), false);
  }
});

test('only exact own-store URLs are allowed', () => {
  const token = 'vercel_blob_rw_example_test';
  assert.equal(ownedBlobUrl(blob.url, token), blob.url);
  for (const value of [blob.url + '?x=1', blob.url.replace('example.', 'other.'), 'http://127.0.0.1', blob.url.replace('.com/', '.com.evil/'), blob.url.replace('https:', 'http:'), blob.url.replace('https://', 'https://user@')]) {
    assert.equal(ownedBlobUrl(value, token), null);
  }
});

test('writes and verifies backup before conditional deletion; safe retry uses verified backup', async t => {
  const f = await fixture(t);
  const result = await archiveOne(blob, f.options);
  const dir = path.join(f.root, 'files', result.id);
  assert.deepEqual(await readFile(path.join(dir, 'original.txt')), data);
  const receipt = JSON.parse(await readFile(path.join(dir, 'receipt.json'), 'utf8'));
  assert.equal(receipt.sha256.length, 64);
  assert.ok(receipt.deletedAt);
  assert.deepEqual(f.deleted, [{ url: blob.url, options: { ifMatch: '"v1"' } }]);
  await archiveOne(blob, { ...f.options, fetchBlob: () => { throw new Error('must reuse verified disk copy'); } });
});

test('new uploads never download or delete', async t => {
  const f = await fixture(t, { fetchBlob: () => { throw new Error('active upload must not be read'); } });
  assert.equal((await archiveOne({ ...blob, uploadedAt: new Date(now) }, f.options)).status, 'recent');
  assert.equal(f.deleted.length, 0);
});

for (const [label, response] of [
  ['blocked store', () => new Response('blocked', { status: 403 })],
  ['truncated download', () => new Response(data.subarray(0, 4), { headers: { etag: blob.etag } })],
  ['changed download', () => new Response(data, { headers: { etag: '"v2"' } })],
]) test(`${label} never deletes`, async t => {
  const f = await fixture(t, { fetchBlob: async () => response() });
  await assert.rejects(archiveOne(blob, f.options));
  assert.equal(f.deleted.length, 0);
});

test('remote replacement after download is retained', async t => {
  const f = await fixture(t, { headBlob: async () => ({ ...blob, etag: '"v2"' }) });
  await assert.rejects(archiveOne(blob, f.options), /changed/);
  assert.equal(f.deleted.length, 0);
});

test('conditional delete conflict leaves valid local backup and reports failure', async t => {
  const f = await fixture(t, { deleteBlob: async () => { throw new Error('precondition failed'); } });
  await assert.rejects(archiveOne(blob, f.options), /precondition/);
  const result = await archiveOne(blob, { ...f.options, remove: false });
  assert.deepEqual(await readFile(path.join(f.root, 'files', result.id, 'original.txt')), data);
});

test('corrupt local file is downloaded again before deletion; failed download retains remote', async t => {
  const f = await fixture(t);
  const result = await archiveOne(blob, { ...f.options, remove: false });
  await writeFile(path.join(f.root, 'files', result.id, 'original.txt'), Buffer.alloc(data.length));
  await assert.rejects(archiveOne(blob, { ...f.options, fetchBlob: async () => new Response('', { status: 403 }) }));
  assert.equal(f.deleted.length, 0);
});

test('a file larger than 4.5 MB is archived intact', async t => {
  const large = Buffer.alloc(6 * 1024 * 1024, 65);
  const largeBlob = { ...blob, size: large.length };
  const f = await fixture(t, { fetchBlob: async () => new Response(large, { headers: { etag: blob.etag } }), headBlob: async () => largeBlob });
  const result = await archiveOne(largeBlob, f.options);
  assert.deepEqual(await readFile(path.join(f.root, 'files', result.id, 'original.txt')), large);
  assert.equal(f.deleted.length, 1);
});

test('cleanup refuses missing or incompatible deployed policy', () => {
  assert.throws(() => checkLifecycle({}));
  checkLifecycle({ version: 1, parseMaxAgeMs: BLOB_PARSE_MAX_AGE_MS, archiveMinAgeMs: BLOB_ARCHIVE_MIN_AGE_MS, parserMaxDurationSeconds: 300 });
});
