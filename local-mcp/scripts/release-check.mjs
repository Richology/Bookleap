import fs from 'node:fs';
import {createPublicKey} from 'node:crypto';
const config = JSON.parse(fs.readFileSync(new URL('../release-config.json', import.meta.url), 'utf8'));
for (const name of ['feedUrl', 'manifestUrl']) {
  const url = new URL(config[name]);
  if (url.protocol !== 'https:' || /example\.|localhost|127\.0\.0\.1/.test(url.hostname)) throw new Error('Real HTTPS release channels required');
}
if (createPublicKey(config.publicKey).asymmetricKeyType !== 'ed25519') throw new Error('Ed25519 update public key required');
if (!process.env.CSC_LINK && !process.env.CSC_NAME) throw new Error('Platform signing identity required');
if (process.platform === 'win32' && !config.publisherName) throw new Error('Windows publisherName required');
if (process.platform === 'darwin' && !process.env.APPLE_API_KEY && !process.env.APPLE_ID) throw new Error('Apple notarization credentials required');
if (!process.env.BOOKLEAP_UPDATE_SIGNING_KEY) throw new Error('Update manifest signing key required');
console.log('Release prerequisite configuration found; signing and notarization must still pass during build.');
