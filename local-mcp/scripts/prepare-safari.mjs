import fs from 'node:fs';
import path from 'node:path';
const base = path.resolve(import.meta.dirname, '..');
const project = path.join(base, 'safari/project/BookLeap Bridge');
const target = path.join(project, 'BookLeap Bridge Extension');
fs.copyFileSync(path.join(base, 'safari/SafariWebExtensionHandler.swift'), path.join(target, 'SafariWebExtensionHandler.swift'));
for (const name of ['manifest.json', 'background.js', 'content.js']) fs.copyFileSync(path.join(base, 'extension', name), path.join(target, 'Resources', name));
const file = path.join(project, 'BookLeap Bridge.xcodeproj/project.xcproj');
let text = fs.readFileSync(file, 'utf8');
text = text.replaceAll('"ENABLE_OUTGOING_NETWORK_CONNECTIONS": "YES",', '').replaceAll('"ENABLE_APP_SANDBOX": "YES",', '"ENABLE_APP_SANDBOX": "YES",\n        "ENABLE_OUTGOING_NETWORK_CONNECTIONS": "YES",');
text = text.replaceAll('"MACOSX_DEPLOYMENT_TARGET": "27.0"', '"MACOSX_DEPLOYMENT_TARGET": "12.0"').replaceAll('cn.bookleap.BookLeap-Bridge', 'cn.bookleap.bridge');
fs.writeFileSync(file, text);
const info = path.join(target, 'Info.plist');
let plist = fs.readFileSync(info, 'utf8');
if (!plist.includes('NSAllowsLocalNetworking')) plist = plist.replace('<dict>', '<dict>\n\t<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>\n\t<key>NSLocalNetworkUsageDescription</key><string>连接本机书跃组件，将已授权的拆书内容保存到你的知识库。</string>');
fs.writeFileSync(info, plist);
for (const name of ['AppDelegate.swift', 'ViewController.swift']) {
  const file = path.join(project, 'BookLeap Bridge', name);
  let source = fs.readFileSync(file, 'utf8').replace(/\/\/  Created by .*\n/, '');
  source = source.replace('if (message.body as! String != "open-preferences")', 'if (message.body as? String != "open-preferences")');
  fs.writeFileSync(file, source);
}
