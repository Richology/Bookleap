import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('./highlights.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {addBookHighlight,loadBookHighlights,saveHighlightExplanation,deleteBookHighlight}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const values=new Map();
globalThis.window={};
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const mark={id:'h1',bookRef:'book',bookTitle:'测试',author:'',cardKey:'summary',cardLabel:'摘要',selectedText:'测试文字',startOffset:0,endOffset:4,contentHash:1,createdAt:'2026-11-09'};
const explanation={explanation:'已保存的解释',example:'辅助例子'};
test('old highlights load, explanations survive reload and repeated poster creation',()=>{
 values.clear(); addBookHighlight(mark);
 assert.equal(loadBookHighlights('book')[0].explanation,undefined);
 assert.equal(saveHighlightExplanation('book','h1',explanation),true);
 assert.deepEqual(loadBookHighlights('book')[0].explanation,explanation);
 addBookHighlight({...mark,id:'poster-id'});
 const saved=loadBookHighlights('book');
 assert.equal(saved.length,1);assert.equal(saved[0].id,'h1');assert.deepEqual(saved[0].explanation,explanation);
});
test('late explanation cannot resurrect a deleted highlight',()=>{
 values.clear();addBookHighlight(mark);deleteBookHighlight('book','h1');
 assert.equal(saveHighlightExplanation('book','h1',explanation),false);
 assert.deepEqual(loadBookHighlights('book'),[]);
});
test('storage errors are reported instead of claiming the explanation was saved',()=>{
 values.clear();addBookHighlight(mark);const set=localStorage.setItem;
 localStorage.setItem=()=>{throw Error('quota')};
 try {assert.equal(saveHighlightExplanation('book','h1',explanation),false);} finally {localStorage.setItem=set;}
});
