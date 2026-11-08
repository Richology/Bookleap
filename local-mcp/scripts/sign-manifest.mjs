import fs from 'node:fs';
import {sign, createPrivateKey} from 'node:crypto';
// Input is a reviewed platform-specific manifest containing hashes from electron-builder metadata.
const [input, output] = process.argv.slice(2);
if (!input || !output || !process.env.BOOKLEAP_UPDATE_SIGNING_KEY) throw new Error('Usage: sign-manifest.mjs input.json output.json; signing key path required');
const payload = fs.readFileSync(input, 'utf8');
const parsed = JSON.parse(payload);
if (parsed.schemaVersion !== 1 || parsed.librarySchema !== 1 || !Array.isArray(parsed.files)) throw new Error('Unsupported schema');
const key = createPrivateKey(fs.readFileSync(process.env.BOOKLEAP_UPDATE_SIGNING_KEY));
if (key.asymmetricKeyType !== 'ed25519') throw new Error('Ed25519 required');
fs.writeFileSync(output, JSON.stringify({payload, signature: sign(null, Buffer.from(payload), key).toString('base64')}), {flag:'wx', mode:0o600});
