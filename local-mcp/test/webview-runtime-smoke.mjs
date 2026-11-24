// Run against the runtime copied from an installed app, with a disposable library.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const dir = path.resolve(process.argv[2]);
const home = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'bookleap-webview-test-'));
const mcp = path.join(dir, 'src/mcp.mjs');
const node = path.join(dir, process.platform === 'win32' ? 'node.exe' : 'node');
const child = spawn(node, [path.join(dir,'src/webview-service.mjs'),path.join(home,'app'),home,mcp],
  {env:{...process.env,BOOKLEAP_TEST_HOME:home,BOOKLEAP_TEST_PORT:'48724',CODEX_HOME:path.join(home,'codex')},stdio:['pipe','pipe','inherit']});
const exit = once(child,'exit');
const lines = readline.createInterface({input:child.stdout})[Symbol.asyncIterator]();
async function next() {const {value,done}=await lines.next();assert.equal(done,false);return JSON.parse(value);}
const send = v=>child.stdin.write(JSON.stringify(v)+'\n');
let seq=0;
async function call(action,value) {
  const id=++seq;send({id,action,value});
  const msg=await next();assert.equal(msg.id,id);assert.ok(!msg.error,msg.error);return msg.value;
}
const timeout=setTimeout(()=>{child.kill();console.error('packaged runtime timed out');process.exit(1)},45000);
try {
  assert.ok((await next()).ready);
  const status=await call('status');assert.equal(status.sourceCount,0);
  const {mcpServers:{bookleap:config}}=await call('connection');
  assert.equal(fs.realpathSync(config.command),fs.realpathSync(node));
  const code=await call('pair'); const sourceId=randomUUID();
  const response=fetch('http://127.0.0.1:48724/pair',{method:'POST',headers:{Origin:'https://www.bookleap.cn','Content-Type':'application/json','X-BookLeap-Protocol':'1'},body:JSON.stringify({schemaVersion:1,sourceId,sourceName:'验收书库',code})});
  const confirm=await next();assert.equal(confirm.native,'confirm');assert.match(confirm.value,/https:\/\/www\.bookleap\.cn/);
  send({reply:confirm.id,value:true});assert.equal((await response).status,200);
  assert.equal((await call('status')).sourceCount,1);
  assert.match(await call('pause'),/暂停/);
  assert.match((await call('test')).state,/成功/);
  child.stdin.end();assert.equal((await exit)[0],0);
  const client=new Client({name:'desktop-smoke',version:'1'});
  try {
    await client.connect(new StdioClientTransport({...config,env:{...process.env,...config.env}}));
    const result=await client.callTool({name:'library_status',arguments:{}});
    assert.ok(!result.isError);
  } finally {await client.close();}
  console.log('Verified installed runtime, pairing confirmation, pause, SDK self-test, and MCP after exit.');
} finally {child.stdin.end();clearTimeout(timeout);}
