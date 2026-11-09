/* global preloadQuotePaperTexture, renderQuoteCardImage */
// Compare final PNGs after lossless texture conversion, and verify preload reuse.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from '../local-mcp/node_modules/playwright-core/index.mjs';

const root = new URL('../', import.meta.url);
const source = (await readFile(new URL('app/components/QuoteShareModal.tsx', root), 'utf8'))
  .split('export function QuoteShareModal')[0]
  .replace(/^import .*;\n/gm, '')
  .replace('export function preloadQuotePaperTexture', 'function preloadQuotePaperTexture');
const code = ts.transpile(source, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
let original;
try {
  for (const file of ['quote-paper-texture.png', 'quote-paper-texture-v1.webp']) {
    const page = await browser.newPage();
    let requests = 0;
    await page.route('http://bookleap.test/', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.route('**/textures/*', async route => {
      requests++;
      await route.fulfill({ body: await readFile(new URL(`public/textures/${file}`, root)), contentType: file.endsWith('.png') ? 'image/png' : 'image/webp' });
    });
    await page.goto('http://bookleap.test/');
    await page.addScriptTag({ content: code });
    const images = await page.evaluate(async () => {
      // Preloading and rendering must share the same in-flight request.
      preloadQuotePaperTexture();
      preloadQuotePaperTexture();
      const data = { bookTitle: '无条件养育', author: '艾尔菲·科恩', cardLabel: '全书摘要', text: '无条件养育的本质是与孩子建立深度联结，而非控制孩子听话。父母需从孩子的视角理解其行为，而非通过权力压制。' };
      return [await renderQuoteCardImage(data, 'portrait'), await renderQuoteCardImage(data, 'xiaoyuzhou')];
    });
    assert.equal(requests, 1, 'Preload and both sizes should reuse one texture request');
    if (original) assert.deepEqual(images, original, 'Final PNGs must remain byte-for-byte identical');
    else original = images;
    await page.close();
  }
  console.log('PASS: portrait and landscape PNGs unchanged; preload and rendering share one texture request');
} finally {
  await browser.close();
}
