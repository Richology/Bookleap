import fs from 'node:fs';
import path from 'node:path';
import {assertSafePath} from './store.mjs';
export function registerReader(root) {
  if (!root) return () => {};
  assertSafePath(root); fs.mkdirSync(root, {recursive: true, mode: 0o700});
  const file = path.join(root, `${process.pid}.reader`);
  fs.writeFileSync(assertSafePath(file), '', {mode: 0o600});
  return () => {try {fs.unlinkSync(file);} catch { /* A crash lease is checked by PID. */ }};
}
export function readersActive(root) {
  if (!fs.existsSync(root)) return false;
  assertSafePath(root);
  for (const name of fs.readdirSync(root)) {
    if (!/^\d+\.reader$/.test(name)) continue;
    try {process.kill(Number(name.split('.')[0]), 0); return true;}
    catch (e) {if (e.code !== 'ESRCH') return true; fs.unlinkSync(assertSafePath(path.join(root, name)));}
  }
  return false;
}
