import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionError, explanationSources, parseExplanation} from './selectionExplanation.mjs';

test('explanations omit source-tracing fields even if a model returns them', () => {
 const result = parseExplanation(JSON.stringify({explanation:'坚持会积累成果。', evidence:[{quote:'模型生成的引文'}],example:'每天读两页。'}));
 assert.deepEqual(result,{explanation:'坚持会积累成果。',example:'每天读两页。'});
});
test('missing original context still permits a card explanation', () => {
 assert.deepEqual(explanationSources({evidenceBriefs:[{summary:'摘要'}]}),[]);
 assert.deepEqual(parseExplanation('{"explanation":"根据卡片解释"}'),{explanation:'根据卡片解释',example:''});
});
test('available original samples remain supplemental context', () => {
 const sources=explanationSources({samples:[{sourceId:'S1',chapterIndex:1,chapterTitle:'习惯',preview:'每天坚持阅读十分钟。'}]},'坚持阅读');
 assert.equal(sources[0].text,'每天坚持阅读十分钟。');
});
test('empty, whitespace, long selections and boundary', () => {
 assert.ok(selectionError('   ')); assert.ok(selectionError('字'.repeat(801)));
 assert.equal(selectionError('字'.repeat(800)),''); assert.ok(selectionError(null));
});
test('model output cleanup and malformed/empty output failure', () => {
 assert.equal(parseExplanation('```json\n{"explanation":"解释"}\n```').explanation,'解释');
 assert.throws(()=>parseExplanation('错误')); assert.throws(()=>parseExplanation('{"explanation":""}'));
});
