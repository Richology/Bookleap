import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import { atomicWrite, assertSafePath } from './store.mjs';
import { hash, Fault } from './protocol.mjs';
export function previewConfig(file, command, script, root, runtime) {
  assertSafePath(file);
  const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const parsed = TOML.parse(original);
  if (parsed.mcp_servers?.bookleap) throw new Fault('codex_name_conflict');
  const addition = '\n# BookLeap local read-only MCP\n' + TOML.stringify({mcp_servers: {bookleap: {command, args: [script], env: {ELECTRON_RUN_AS_NODE: '1', BOOKLEAP_LIBRARY: root, ...(runtime ? {BOOKLEAP_RUNTIME: runtime} : {})}}}});
  TOML.parse(original + addition);
  return {file, originalHash: hash(original), addition};
}
export function applyConfig(preview) {
  const file = assertSafePath(preview.file);
  fs.mkdirSync(path.dirname(file), {recursive: true, mode: 0o700});
  const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (hash(original) !== preview.originalHash) throw new Fault('codex_config_changed_preview_again');
  const backup = `${file}.bookleap-backup-${Date.now()}`;
  // Preserve formatting and all unrelated fields. Backup before atomic replacement.
  fs.writeFileSync(assertSafePath(backup), original, {flag: 'wx', mode: 0o600});
  atomicWrite(file, original + preview.addition);
  return {backup, writtenHash: hash(original + preview.addition)};
}
export function restoreConfig(file, backup, expectedHash) {
  assertSafePath(file); assertSafePath(backup);
  if (hash(fs.readFileSync(file, 'utf8')) !== expectedHash) throw new Fault('codex_config_changed_do_not_overwrite');
  atomicWrite(file, fs.readFileSync(backup));
}
