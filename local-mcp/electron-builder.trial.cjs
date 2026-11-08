// Separate opt-in trial build: never weakens the signed release configuration.
const base = require('./electron-builder.cjs');
if (require('node:fs').existsSync(require('node:path').join(__dirname, 'release-config.json'))) throw new Error('Remove release config before building the unsigned trial');
module.exports = {
  ...base,
  electronVersion: '44.9.3',
  directories: {output: 'dist-trial'},
  forceCodeSigning: false,
  artifactName: 'bookleap-sync-${version}-${os}-${arch}.${ext}',
  extraMetadata: {version: '0.1.0-trial.1', bookleapUnsignedTrial: true},
  mac: {...base.mac, target: [{target: 'dmg', arch: ['arm64']}], identity: null, notarize: false},
  win: {...base.win, signAndEditExecutable: false},
};
