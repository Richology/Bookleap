// Real HTTPS bridge test fixture: synthetic data only; no browser storage reads.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LibraryStore} from '../src/store.mjs';
import {Bridge} from '../src/bridge.mjs';
const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'bookleap-https-'));
const store = new LibraryStore(parent);
const bridge = new Bridge(store, {port: 48723, onPair: async () => true});
await bridge.listen();
const pairing = bridge.createPairing();
console.log(JSON.stringify({code: pairing.code, parent, port:48723}));
const close = async () => {await bridge.close(); store.close(); fs.rmSync(parent, {recursive:true,force:true}); process.exit();};
process.on('SIGTERM', close); process.on('SIGINT', close);
