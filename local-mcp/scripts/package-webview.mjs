import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const mac = process.platform === 'darwin' && process.arch === 'arm64';
const windows = process.platform === 'win32' && process.arch === 'x64';
if (!mac && !windows) throw new Error('Build on Apple Silicon Mac or Windows x64');
const config = require('../src-tauri/tauri.conf.json');
function run(command, args) {
  const result = spawnSync(command, args, {cwd:root, stdio:'inherit'});
  if (result.error || result.status !== 0) throw result.error || Error(command+' failed');
}
const cli = path.join(path.dirname(require.resolve('@tauri-apps/cli/package.json')), 'tauri.js');
run(process.execPath, [cli, 'build', '--bundles', mac ? 'app' : 'nsis']);
const bundle = path.join(root, 'src-tauri/target/release/bundle');
const output = path.join(root, 'dist-trial');
fs.mkdirSync(output, {recursive:true});
const prefix = path.join(output, 'bookleap-sync-' + config.version);
if (mac) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(),'bookleap-webview-'));
  try {
    const name = config.productName + '.app';
    const app = path.join(stage,name);
    run('ditto',[path.join(bundle,'macos',name),app]);
    run('codesign',['--force','--sign','-',path.join(app,'Contents/Resources/runtime/node')]);
    run('codesign',['--force','--sign','-',app]);
    run('codesign',['--verify','--strict','--deep',app]);
    fs.copyFileSync(path.join(root, 'mac-install.zh-CN.txt'), path.join(stage, '首次打开说明.txt'));
    fs.symlinkSync('/Applications',path.join(stage,'Applications'));
    run('hdiutil',['create','-volname',config.productName,'-srcfolder',stage,'-format','UDZO','-ov',prefix+'-mac-arm64.dmg']);
  } finally {fs.rmSync(stage,{recursive:true,force:true});}
} else {
  const dir = path.join(bundle,'nsis');
  const installers = fs.readdirSync(dir).filter(f=>f.endsWith('-setup.exe') && f.includes(config.version.split('-')[0]));
  if (installers.length !== 1) throw Error('Expected one newly built NSIS installer');
  fs.copyFileSync(path.join(dir,installers[0]),prefix+'-win-x64.exe');
}
