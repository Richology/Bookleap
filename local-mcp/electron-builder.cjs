const fs = require('node:fs');
const path = require('node:path');
const configPath = path.join(__dirname, 'release-config.json');
const release = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : null;
if (release && (process.platform === 'win32' || process.argv.includes('--win') || process.argv.includes('-w')) && !release.publisherName) throw new Error('Windows releases require a verified publisherName');
module.exports = {
  forceCodeSigning: Boolean(release),
  appId: 'cn.bookleap.local', productName: '书跃本地同步助手', asar: false,
  directories: {output: 'dist'},
  files: ['src/**/*', 'ui/**/*', 'extension/**/*', 'package.json', ...(release ? ['release-config.json'] : [])],
  protocols: [{name: 'BookLeap citation', schemes: ['bookleap-local']}],
  mac: {target: [{target: 'dmg', arch: ['arm64', 'x64']}, {target: 'zip', arch: ['arm64', 'x64']}], hardenedRuntime: true, notarize: Boolean(release)},
  win: {target: [{target: 'nsis', arch: ['x64']}], verifyUpdateCodeSignature: true, ...(release?.publisherName ? {publisherName: release.publisherName} : {})},
  nsis: {oneClick: false, allowToChangeInstallationDirectory: true, deleteAppDataOnUninstall: false},
  ...(release ? {publish: [{provider: 'generic', url: release.feedUrl}]} : {}),
};
