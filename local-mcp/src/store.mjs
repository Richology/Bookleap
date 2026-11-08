import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Fault, hash, snapshotSchema } from './protocol.mjs';

// Only a fixed file inside a dedicated directory is managed. Never follow a symlink.
export function assertSafePath(target) {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Fault('symlink_not_allowed'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return absolute;
}
export function atomicWrite(file, data) {
  assertSafePath(file);
  const temp = `${file}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, file);
    // Windows does not support opening directories for fsync.
    if (process.platform !== 'win32') { const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); } }
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
export function readLibrary(root) {
  const file = assertSafePath(path.join(root, 'library.json'));
  try {
    const stat = fs.statSync(file);
    if (stat.size > 128 * 1024 * 1024) throw new Fault('library_too_large');
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.schemaVersion !== 1 || !Array.isArray(state.sources)) throw new Fault('upgrade_required', 426);
    return state;
  } catch (e) { if (e.code === 'ENOENT') return {schemaVersion: 1, generation: 0, sources: []}; throw e; }
}
export class LibraryStore {
  constructor(parent) {
    this.root = assertSafePath(path.join(parent, 'BookLeapLibrary'));
    fs.mkdirSync(this.root, {recursive: true, mode: 0o700});
    const marker = path.join(this.root, '.bookleap');
    if (!fs.existsSync(marker)) {
      if (fs.readdirSync(this.root).length) throw new Fault('directory_not_owned');
      fs.writeFileSync(marker, '1', {flag: 'wx', mode: 0o600});
    }
    if (fs.readFileSync(assertSafePath(marker), 'utf8') !== '1') throw new Fault('directory_not_owned');
    // Exclusive lifetime lock: MCP readers do not acquire it. Stale locks require explicit recovery.
    this.lock = path.join(this.root, '.writer-lock');
    assertSafePath(this.lock);
    if (fs.existsSync(this.lock)) {
      const pid = Number(fs.readFileSync(this.lock, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid < 1) throw new Fault('writer_lock_needs_recovery');
      try { process.kill(pid, 0); throw new Fault('writer_active'); }
      catch (e) { if (e.code === 'ESRCH') fs.unlinkSync(this.lock); else throw e; }
    }
    this.fd = fs.openSync(this.lock, 'wx', 0o600);
    fs.writeFileSync(this.fd, String(process.pid));
    try {
      this.state = readLibrary(this.root);
      for (const name of fs.readdirSync(this.root)) {
        if (/^library\.json\.[0-9a-f-]{36}\.tmp$/.test(name)) fs.unlinkSync(assertSafePath(path.join(this.root, name)));
      }
    } catch (e) { this.close(); throw e; }
  }
  commit(snapshot, binding) {
    const value = snapshotSchema.parse(snapshot);
    if (value.sourceId !== binding.sourceId) throw new Fault('source_mismatch', 403);
    const prior = this.state.sources.find(s => s.sourceId === value.sourceId);
    const digest = hash(value);
    if (prior?.requestId === value.requestId) {
      if (prior.digest !== digest) throw new Fault('request_reused', 409);
      return this.ack(prior);
    }
    if ((prior?.revision ?? 0) !== value.baseRevision) throw new Fault('revision_conflict', 409);
    const source = {...value, sourceName: binding.sourceName, origin: binding.origin,
      digest, revision: value.baseRevision + 1, acknowledgedAt: new Date().toISOString()};
    const next = {...this.state, generation: this.state.generation + 1,
      sources: [...this.state.sources.filter(s => s.sourceId !== value.sourceId), source]};
    const json = JSON.stringify(next);
    if (Buffer.byteLength(json) > 128 * 1024 * 1024) throw new Fault('library_capacity', 413);
    atomicWrite(path.join(this.root, 'library.json'), json);
    this.state = next;
    return this.ack(source);
  }
  ack(source) { return {schemaVersion: 1, revision: source?.revision ?? 0, acknowledgedAt: source?.acknowledgedAt ?? null, count: source?.books.length ?? 0, scope: source?.scope ?? null}; }
  status(sourceId) { return this.ack(this.state.sources.find(s => s.sourceId === sourceId)); }
  close() { if (this.fd !== undefined) { fs.closeSync(this.fd); this.fd = undefined; fs.unlinkSync(this.lock); } }
}
