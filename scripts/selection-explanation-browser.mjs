/* global localStorage, document, window, Event */
import {chromium} from '../local-mcp/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 for(const mobile of [false,true]) {
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
  const page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('bookleap_workspace_disclaimer_accepted_v1','1');localStorage.setItem('bookleap_onboarding_step','completed');});
  let fail=true, requests=0;
  await page.route('**/api/skills/selection-explanation',async route=>{
   requests++;await new Promise(resolve=>setTimeout(resolve,300));
   await route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(fail?{error:'failed'}:{explanation:'这里强调通过清晰理解来改善行动。',example:'先明确每天要读哪两页。'})});
  });
  async function openBook(){
   if(await page.locator('.workspace-prose').count())return;
   await page.getByText('认知觉醒',{exact:true}).last().click();
   await page.locator('article').filter({hasText:'全书摘要'}).click({timeout:30000});
   await page.locator('.workspace-prose p').first().waitFor();
  }
  async function select(long=false){
   await page.locator('.workspace-prose p').first().scrollIntoViewIfNeeded();
   await page.locator('.workspace-prose').evaluate((el,long)=>{
    const range=document.createRange();
    if(long){const p=document.createElement('p');p.textContent='长'.repeat(801);el.append(p);range.selectNodeContents(p);}
    else range.selectNodeContents(el.querySelector('p'));
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));document.dispatchEvent(new Event('touchend'));
   },long);
  }
  async function tapExplain(){const action=page.getByRole('button',{name:'解释一下',exact:true});await action.waitFor();await(mobile?action.tap():action.click());}
  const url=process.env.BOOKLEAP_TEST_URL||'http://127.0.0.1:3001';
  await page.goto(`${url}/workspace`,{waitUntil:'domcontentloaded'});await openBook();
  await select();
  const scrollBefore=await page.evaluate(()=>window.scrollY);
  await tapExplain();
  const dialog=page.getByRole('dialog',{name:'划线解释',exact:true});
  await dialog.getByText('正在解释…').waitFor();
  await dialog.getByRole('button',{name:'重试',exact:true}).waitFor();
  const marks=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('bookleap_highlights_v1:')).flatMap(k=>JSON.parse(localStorage.getItem(k))));
  assert.equal(marks.length,1);assert.equal(marks[0].explanation,undefined);
  fail=false;await dialog.getByRole('button',{name:'重试',exact:true}).click();
  await dialog.getByText('这里强调通过清晰理解来改善行动。',{exact:true}).waitFor();
  assert.equal(await dialog.getByText('原文依据',{exact:true}).count(),0);
  await dialog.getByRole('heading',{name:'举个例子'}).waitFor();
  await dialog.getByRole('img',{name:'AI 生成的辅助例子，非作者原例'}).waitFor();
  assert.equal(await page.evaluate(()=>window.scrollY),scrollBefore);
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=(mobile?390:1280)&&box.y+box.height<=(mobile?844:900));
  if(process.env.BOOKLEAP_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.BOOKLEAP_SCREENSHOT_DIR}/explanation-popover-${mobile?'mobile':'desktop'}.png`});
  await dialog.getByRole('button',{name:'关闭解释'}).click();
  if(!mobile){
   const point=await page.locator('.workspace-prose p').first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const rect=r.getClientRects()[0];return{x:rect.x+10,y:rect.y+rect.height/2};});
   await page.mouse.move(point.x,point.y);
   await page.getByRole('group',{name:'高亮文字操作'}).getByRole('button',{name:'查看解释',exact:true}).click();
  }else{await select();await tapExplain();}
  await dialog.getByText('这里强调通过清晰理解来改善行动。',{exact:true}).waitFor();assert.equal(requests,2);
  await dialog.getByRole('button',{name:'关闭解释'}).click();
  await page.reload({waitUntil:'domcontentloaded'});await openBook();await select();await tapExplain();
  await dialog.getByText('这里强调通过清晰理解来改善行动。',{exact:true}).waitFor();assert.equal(requests,2);
  await dialog.getByRole('button',{name:'关闭解释'}).click();
  await select(true);await page.getByText('选中文字过长，请缩短至 800 字以内。',{exact:true}).waitFor();assert.equal(requests,2);
  console.log(`${mobile?'mobile':'desktop'}: anchored popup, no scroll jump, failure/retry, persistent highlight, saved explanation reopen/reload, no citations and long-selection validation passed`);
  await context.close();
 }
}finally{await browser.close();}
