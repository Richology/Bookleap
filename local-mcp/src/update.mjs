import { verify } from 'node:crypto';
import { Fault, VERSION } from './protocol.mjs';
// The public key and HTTPS channel are release-time inputs, never supplied by a web page.
export function verifyManifest(envelope, config, platform, arch, now = Date.now()) {
  if (typeof envelope.payload !== 'string' || envelope.payload.length > 65536 || typeof envelope.signature !== 'string' || !verify(null, Buffer.from(envelope.payload), config.publicKey, Buffer.from(envelope.signature, 'base64'))) throw new Fault('update_signature_invalid');
  const manifest = JSON.parse(envelope.payload);
  const base = new URL(config.feedUrl);
  if (base.protocol !== 'https:' || manifest.platform !== platform || manifest.arch !== arch || manifest.schemaVersion !== 1 || manifest.librarySchema !== 1) throw new Fault('update_platform_or_schema_mismatch');
  if (!Number.isFinite(manifest.expiresAt) || manifest.expiresAt < now || manifest.expiresAt > now + 7 * 86400000) throw new Fault('update_manifest_expired');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || !Array.isArray(manifest.files) || !manifest.files.length) throw new Fault('invalid_update_manifest');
  for (const file of manifest.files) {
    const url = new URL(file.url, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512)) throw new Fault('update_file_not_trusted');
  }
  return manifest;
}
export function matchRelease(info, manifest) {
  if (info.version !== manifest.version || JSON.stringify(info.files.map(f => ({url: f.url, sha512: f.sha512}))) !== JSON.stringify(manifest.files.map(f => ({url: f.url, sha512: f.sha512})))) throw new Fault('update_metadata_changed');
}
export class UpdateController {
  constructor(updater, config, {platform = process.platform, arch = process.arch, busy = () => false} = {}) {
    this.updater = updater; this.config = config; this.platform = platform; this.arch = arch; this.busy = busy;
    this.state = '未检查'; this.downloaded = false; this.checking = false;
    updater.autoDownload = false; updater.autoInstallOnAppQuit = false; updater.allowDowngrade = false;
    updater.logger = null; // No URLs, paths or credentials in default logs.
    updater.on('error', () => { this.state = '更新失败；继续使用当前版本'; this.downloaded = false; });
  }
  async check() {
    if (!this.config) return this.state = '缺少可信发布渠道与公钥；未尝试下载。';
    if (this.checking) return this.state;
    this.checking = true;
    try {
      const url = new URL(this.config.manifestUrl);
      if (url.protocol !== 'https:') throw new Fault('https_required');
      const response = await fetch(url, {redirect: 'error', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Fault('update_download_failed');
      const parts = []; let size = 0;
      for await (const part of response.body) {size += part.length; if (size > 100000) throw new Fault('manifest_too_large'); parts.push(part);}
      const manifest = verifyManifest(JSON.parse(Buffer.concat(parts).toString()), this.config, this.platform, this.arch);
      if (manifest.version === VERSION) return this.state = '已是当前版本';
      this.updater.setFeedURL({provider: 'generic', url: this.config.feedUrl});
      const result = await this.updater.checkForUpdates();
      if (!result?.updateInfo) return this.state = '无可用更新';
      matchRelease(result.updateInfo, manifest);
      await this.updater.downloadUpdate(); // SHA-512 + platform publisher verification remain enabled.
      this.downloaded = true; return this.state = `已下载 ${manifest.version}；当前进程 ${VERSION}。空闲时安装，Agent 需重连以切换 MCP 版本。`;
    } catch { this.downloaded = false; return this.state = '签名、平台校验或下载失败；继续使用当前版本。'; }
    finally { this.checking = false; }
  }
  install() {
    if (!this.downloaded) return '尚无经过校验的已下载更新';
    if (this.busy()) return '同步或 MCP 调用仍在运行，已延期安装；请关闭 Agent 的 MCP 连接后重试。';
    // Schema 1 only: no data migration. Incompatible migrations cannot auto-install.
    this.updater.quitAndInstall(false, true); return '正在安装';
  }
}
