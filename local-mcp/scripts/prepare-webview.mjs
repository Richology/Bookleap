import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const platforms = {'darwin-arm64': 'node-bin-darwin-arm64', 'win32-x64': 'node-win-x64'};
const pkg = platforms[`${process.platform}-${process.arch}`];
if (!pkg) throw new Error('Apple Silicon macOS or Windows x64 required');
const pkgDir = path.dirname(require.resolve(pkg + '/package.json'));
const node = require(pkg + '/package.json').bin.node;
const runtime = path.join(root, 'src-tauri/runtime');
const frontend = path.join(root, 'src-tauri/frontend');
fs.rmSync(runtime, {recursive:true,force:true});
fs.mkdirSync(runtime, {recursive: true});
fs.cpSync(path.dirname(require.resolve('zod/package.json')), path.join(runtime, 'node_modules/zod'), {recursive:true});
fs.cpSync(path.join(root, 'ui'), frontend, {recursive: true});
fs.copyFileSync(path.join(pkgDir, node), path.join(runtime, path.basename(node)));
fs.copyFileSync(path.join(root, 'licenses', `node-${require(pkg + '/package.json').version}.txt`), path.join(runtime, 'NODE-LICENSE.txt'));
for (const name of ['LICENSE','NOTICE.md']) fs.copyFileSync(path.join(root, name), path.join(runtime, name));
fs.copyFileSync(path.join(root, '../THIRD_PARTY_NOTICES.md'), path.join(runtime, 'THIRD_PARTY_NOTICES.md'));
fs.writeFileSync(path.join(runtime, 'package.json'), JSON.stringify({version: require('../src-tauri/tauri.conf.json').version}));
const {metafile} = await build({
  metafile: true,
  absWorkingDir: root, entryPoints: ['src/mcp.mjs', 'src/webview-service.mjs'],
  external: ['zod','zod/*'], bundle: true, platform: 'node', target: 'node22', format: 'esm', outdir: path.join(runtime, 'src'),
  outExtension: {'.js': '.mjs'}, legalComments: 'eof',
  banner: {js: "import {createRequire as __makeRequire} from 'node:module';const require=__makeRequire(import.meta.url);"}
});

const modules = new Set(['zod']);
for (const input of Object.keys(metafile.inputs)) {
  const match = input.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (match) modules.add(match[1]);
}
for (const name of modules) {
  const folder = path.join(root, 'node_modules', name);
  for (const entry of fs.readdirSync(folder, {withFileTypes:true})) {
    if (entry.isFile() && /^(licen[sc]e|copying|notice)([.-]|$)/i.test(entry.name)) {
      const dest = path.join(runtime, 'licenses', name);
      fs.mkdirSync(dest, {recursive:true});
      fs.copyFileSync(path.join(folder, entry.name), path.join(dest, entry.name));
    }
  }
}
