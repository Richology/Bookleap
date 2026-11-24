// The runner passes the debugging port only to its isolated WebView2 process.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser = await chromium.connectOverCDP('http://127.0.0.1:48725', {timeout:15000});
try {
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('tauri.localhost')) ?? context.pages()[0] ?? await context.waitForEvent('page', {timeout:12000});
  page.setDefaultTimeout(12000);
  await page.getByText('后台运行中', {exact:true}).waitFor();
  await page.locator('#pairButton').click();
  assert.match(await page.locator('#pair').innerText(), /^[a-zA-Z0-9_-]{20,100}$/);
  await page.locator('#donePair').click();
  await page.locator('nav [data-pane="agent"]').click();
  await page.locator('#connectionDetails > summary').click();
  await page.locator('#copyConnection').click();
  await page.getByText('MCP 配置已复制', {exact:false}).waitFor();
  const config = JSON.parse(await page.locator('#connectionConfig').textContent());
  assert.match(config.mcpServers.bookleap.command, /node\.exe$/i);
  await page.locator('[data-action="test"]').click();
  await page.getByText('实际 SDK stdio 工具测试成功', {exact:false}).waitFor();
  console.log('WebView2 displayed live status, generated a pairing code, copied Agent configuration and queried MCP.');
} finally {await browser.close();}
