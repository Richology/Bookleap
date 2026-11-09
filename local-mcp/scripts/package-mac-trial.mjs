import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This trial packages Apple Silicon Mac only');
const root = path.resolve(import.meta.dirname, '..');
const run = (command, args) => {const result = spawnSync(command, args, {cwd:root, stdio:'inherit', env:{...process.env, CSC_IDENTITY_AUTO_DISCOVERY:'false'}}); if (result.error || result.status !== 0) throw result.error || new Error(`${command} failed: ${result.status}`);};
run(process.execPath, ['node_modules/electron-builder/cli.js', '--config', 'electron-builder.trial.cjs', '--dir', '--mac', '--arm64', '--publish', 'never', ...process.argv.slice(2)]);
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'bookleap-installer-'));
try {
  run('/usr/bin/ditto', [path.join(root,'dist-trial/mac-arm64/书跃本地同步助手.app'), path.join(stage,'书跃本地同步助手.app')]);
  fs.symlinkSync('/Applications', path.join(stage, 'Applications'));
  run('/usr/bin/hdiutil', ['create', '-volname', '书跃本地同步助手', '-srcfolder', stage, '-format', 'UDZO', '-ov', path.join(root, 'dist-trial/bookleap-sync-0.1.0-trial.2-mac-arm64.dmg')]);
} finally {fs.rmSync(stage,{recursive:true,force:true});}
