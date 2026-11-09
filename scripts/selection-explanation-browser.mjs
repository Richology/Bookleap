/* global localStorage, document, window, Event */
// Uses the optional local-mcp development Playwright installation; isolated browser storage only.
import {chromium} from '../local-mcp/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
for (const mobile of [false,true]) {
 const context=await browser.newContext(mobile ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true} : {viewport:{width:1280,height:900}});
 const page=await context.newPage();
 await page.addInitScript(()=>{localStorage.setItem('bookleap_workspace_disclaimer_accepted_v1','1');localStorage.setItem('bookleap_onboarding_step','completed');});
 let mode='error'; let requests=0;
 await page.route('**/api/skills/selection-explanation',async route=>{
  requests++;
  assert.ok(route.request().postDataJSON().selection);
  await new Promise(r=>setTimeout(r,400));
  await route.fulfill({status:mode==='error'?502:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'failed'}:{explanation:'这里强调通过清晰理解来改善行动。',example:'先明确每天要读哪两页。',evidence:mode==='evidence'?[{sourceId:'S1',chapterTitle:'测试章节',quote:'用于界面展示的合成原文依据。'}]:[]})});
 });
 await page.goto(`${process.env.BOOKLEAP_TEST_URL || 'http://127.0.0.1:3001'}/workspace`);
 await page.getByText('认知觉醒',{exact:true}).last().click();
 await page.locator('article').filter({hasText:'全书摘要'}).click({timeout:30000});
 await page.locator('.workspace-prose p').first().waitFor();
 async function select(long=false) {
  await page.locator('.workspace-prose').evaluate((el,long)=>{
   const range=document.createRange();
   if(long) {const p=document.createElement('p');p.textContent='长'.repeat(801);el.append(p);range.selectNodeContents(p);}
   else range.selectNodeContents(el.querySelector('p'));
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   document.dispatchEvent(new Event('selectionchange'));document.dispatchEvent(new Event('touchend'));
  },long);
 }
 await select();
 const action=page.getByRole('button',{name:'解释一下',exact:true});
 await action.waitFor();
 assert.equal(await page.locator('[data-selection-explanation-toolbar]').count(),1);
 assert.equal(await page.getByRole('button',{name:'生成书摘图',exact:true}).count(),1);
 assert.ok(await page.getByRole('button',{name:'生成书摘图',exact:true}).isEnabled());
 if(mobile){const box=await action.boundingBox();assert.ok(box.y>700 && box.y<844);}
 await (mobile ? action.tap() : action.click());
 await page.getByText('正在解释…',{exact:true}).waitFor();
 await page.getByRole('button',{name:'重试',exact:true}).waitFor();
 assert.ok((await page.locator('section[aria-label="划线解释"] blockquote').first().innerText()).length>0);
 mode='missing';await page.getByRole('button',{name:'重试',exact:true}).click();
 await page.getByText('暂未找到可核对的原文位置。以上解释基于现有上下文，依据有限。',{exact:true}).waitFor();
 await page.getByText('辅助理解的例子（AI 生成）',{exact:true}).waitFor();
 await page.getByRole('button',{name:'收起解释',exact:true}).click();
 assert.equal(await page.locator('section[aria-label="划线解释"]').count(),0);
 mode='evidence';await select();await (mobile ? action.tap() : action.click());
 await page.getByText('测试章节 · 原文片段 S1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'收起解释',exact:true}).click();
 await select(true);await page.getByText('选中文字过长，请缩短至 800 字以内。',{exact:true}).waitFor();
 assert.equal(requests,3);
 await select();
 const quote=page.getByRole('button',{name:'生成书摘图',exact:true});
 await (mobile ? quote.tap() : quote.click());
 await page.waitForFunction(()=>!document.querySelector('[data-selection-explanation-toolbar]'));
 assert.ok(await page.getByText('收起解释',{exact:true}).count()===0);
 await page.getByRole('dialog',{name:'划线书摘分享图'}).getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('dialog',{name:'划线书摘分享图'}).waitFor({state:'hidden'});
 if (!mobile) {
   const paragraph=page.locator('.workspace-prose p').first();
   await paragraph.scrollIntoViewIfNeeded();
   const point=await paragraph.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const rect=r.getClientRects()[0];return {x:rect.x+10,y:rect.y+rect.height/2};});
   await page.mouse.move(point.x,point.y);
   const menu=page.getByRole('group',{name:'高亮文字操作'});
   await menu.waitFor();
   assert.equal(await menu.getByRole('button').count(),3);
   await page.screenshot({path:'/private/tmp/bookleap-highlight-menu.png'});
   await menu.getByRole('button',{name:'解释一下',exact:true}).click();
   await page.getByText('正在解释…',{exact:true}).waitFor();
   await page.getByText('测试章节 · 原文片段 S1',{exact:true}).waitFor();
   assert.equal(requests,4);
 }

 console.log(`${mobile?'mobile touch emulation':'desktop'}: loading, failure, retry, missing source, example label, evidence, collapse and long selection passed`);
 await context.close();
}
}finally{await browser.close();}
