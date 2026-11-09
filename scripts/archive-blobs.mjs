import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { list, head, del } from '@vercel/blob';
import { canArchiveBlob, ownedBlobUrl, BLOB_LIFECYCLE_VERSION, BLOB_PARSE_MAX_AGE_MS, BLOB_ARCHIVE_MIN_AGE_MS } from '../lib/blobLifecycle.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const archiveRoot = path.join(projectRoot, 'book-archive');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const identity = blob => JSON.stringify([blob.url, blob.size, new Date(blob.uploadedAt).toISOString(), blob.etag]);

async function syncDirectory(dir) {
  const handle = await open(dir, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function atomicJson(filename, data) {
  const tmp = `${filename}.${randomUUID()}.part`;
  const handle = await open(tmp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await rename(tmp, filename);
  await syncDirectory(path.dirname(filename));
}

async function diskDigest(filename) {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Archive target is not a regular file');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return { size: stat.size, sha256: hash.digest('hex') };
}

// Dependencies are injectable so failure paths can be tested without real books or cloud deletes.
export async function archiveOne(blob, { root, fetchBlob, headBlob, deleteBlob, remove = false, now = Date.now() }) {
  if (!canArchiveBlob(blob.uploadedAt, now)) return { status: 'recent' };
  if (!blob.etag || !Number.isSafeInteger(blob.size) || blob.size < 0 || blob.size > 100 * 1024 * 1024) {
    throw new Error('Invalid Blob metadata; refusing archive/delete');
  }
  const id = sha256(identity(blob));
  const dir = path.join(root, 'files', id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // Hash directory prevents collisions, traversal, and long source filenames.
  const ext = /\.(epub|pdf|txt|azw3)$/i.exec(blob.pathname)?.[0]?.toLowerCase();
  if (!ext) return { status: 'unsupported' };
  const filename = path.join(dir, `original${ext}`);
  const receiptPath = path.join(dir, 'receipt.json');
  let receipt;
  try {
    const saved = JSON.parse(await readFile(receiptPath, 'utf8'));
    const disk = await diskDigest(filename);
    if (saved.identity === identity(blob) && disk.size === blob.size && disk.sha256 === saved.sha256) receipt = saved;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error; // corrupt metadata or unexpected disk failures never authorize deletion
  }
  if (!receipt) {
    const response = await fetchBlob(blob);
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
    const remoteEtag = response.headers.get('etag');
    if (!remoteEtag || remoteEtag !== blob.etag) throw new Error('Download ETag differs from snapshot');
    const tmp = `${filename}.${randomUUID()}.part`;
    const handle = await open(tmp, 'wx', 0o600);
    let size = 0;
    const hash = createHash('sha256');
    try {
      for await (const raw of response.body) {
        const chunk = Buffer.from(raw);
        size += chunk.length;
        if (size > blob.size) throw new Error('Download exceeds expected size');
        hash.update(chunk);
        await handle.writeFile(chunk);
      }
      if (size !== blob.size) throw new Error('Incomplete download');
      await handle.sync();
    } catch (error) {
      await handle.close();
      await rm(tmp, { force: true });
      throw error;
    }
    await handle.close();
    const expectedHash = hash.digest('hex');
    const disk = await diskDigest(tmp);
    if (disk.size !== blob.size || disk.sha256 !== expectedHash) throw new Error('Disk verification failed');
    await rename(tmp, filename);
    await syncDirectory(dir);
    receipt = { identity: identity(blob), blob, sha256: expectedHash, archivedAt: new Date(now).toISOString() };
    await atomicJson(receiptPath, receipt);
  }
  if (remove) {
    const current = await headBlob(blob.url);
    if (identity(current) !== identity(blob)) throw new Error('Remote object changed; retaining it');
    // Conditional delete protects against a replacement between HEAD and DELETE.
    await deleteBlob(blob.url, { ifMatch: blob.etag });
    await atomicJson(receiptPath, { ...receipt, deletedAt: new Date().toISOString() });
  }
  return { status: remove ? 'archived-and-deleted' : 'archived', bytes: blob.size, id };
}

export function checkLifecycle(policy) {
  if (policy.version !== BLOB_LIFECYCLE_VERSION || policy.parseMaxAgeMs !== BLOB_PARSE_MAX_AGE_MS ||
      policy.archiveMinAgeMs !== BLOB_ARCHIVE_MIN_AGE_MS || policy.parserMaxDurationSeconds !== 300) {
    throw new Error('Production lifecycle is not deployed; deletion is disabled');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--delete', '--dry-run'].includes(arg)) || (args.includes('--delete') && args.includes('--dry-run'))) {
    throw new Error('Usage: node scripts/archive-blobs.mjs [--dry-run | --delete]');
  }
  const remove = args.includes('--delete');
  await mkdir(archiveRoot, { recursive: true, mode: 0o700 });
  const stat = await lstat(archiveRoot);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Archive root must be a real directory');
  let env = {};
  try { env = parseEnv(await readFile(path.join(archiveRoot, '.env'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const token = env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Missing book-archive/.env BLOB_READ_WRITE_TOKEN');
  const lock = path.join(archiveRoot, '.run-lock');
  await mkdir(lock); // Fail closed on concurrent runs or an interrupted previous process.
  try {
    await atomicJson(path.join(lock, 'owner.json'), { pid: process.pid, startedAt: new Date().toISOString() });
    if (remove) {
      const response = await fetch('https://www.bookleap.cn/api/upload', { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error('Production lifecycle check failed; deletion is disabled');
      checkLifecycle(await response.json());
    }
    const snapshot = [];
    let cursor;
    do {
      const page = await list({ token, limit: 1000, ...(cursor ? { cursor } : {}) });
      snapshot.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
      if (page.hasMore && !cursor) throw new Error('Incomplete pagination');
    } while (cursor);
    const now = Date.now();
    await atomicJson(path.join(archiveRoot, 'last-inventory.json'), { capturedAt: new Date(now).toISOString(), blobs: snapshot });
    const summary = { total: snapshot.length, archived: 0, deleted: 0, skipped: 0, failed: 0, bytes: 0 };
    for (const blob of snapshot) {
      if (!ownedBlobUrl(blob.url, token) || !/\.(epub|pdf|azw3|txt)$/i.test(blob.pathname) || !canArchiveBlob(blob.uploadedAt, now)) {
        summary.skipped++; continue;
      }
      if (args.includes('--dry-run')) { summary.skipped++; continue; }
      try {
        const result = await archiveOne(blob, {
          root: archiveRoot, now, remove,
          fetchBlob: b => fetch(b.url, { redirect: 'error', cache: 'no-store', headers: { 'If-Match': b.etag }, signal: AbortSignal.timeout(300_000) }),
          headBlob: url => head(url, { token }),
          deleteBlob: (url, options) => del(url, { token, ...options }),
        });
        summary.archived++; summary.bytes += result.bytes || 0;
        if (remove) summary.deleted++;
      } catch (error) {
        summary.failed++;
        // No credentials or book contents are logged.
        console.error(`Archive failed (${sha256(blob.url).slice(0, 12)}): ${error.message}`);
        if (/HTTP (401|403|429)/.test(error.message)) break;
      }
    }
    await atomicJson(path.join(archiveRoot, 'last-run.json'), { finishedAt: new Date().toISOString(), remove, ...summary });
    console.log(JSON.stringify(summary));
    if (summary.failed) process.exitCode = 1;
  } finally { await rm(lock, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
