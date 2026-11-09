import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionError, explanationSources, parseExplanation} from './selectionExplanation.mjs';
const context = {samples: [{sourceId: 'S1', chapterIndex: 3, chapterTitle: '习惯', preview: '每天坚持阅读十分钟，长期积累能够带来改变。'}]};
const sources = explanationSources(context, '坚持阅读');
test('real quotes retain source-owned location, model location is ignored', () => {
 const result = parseExplanation(JSON.stringify({explanation:'坚持会积累成果。', evidence:[{sourceId:'S1',quote:'每天坚持阅读十分钟',chapterTitle:'编造章节',page:123}],example:'每天读两页。'}),sources);
 assert.equal(result.evidence[0].chapterTitle,'习惯'); assert.equal(result.evidence[0].page,undefined);
 assert.equal(result.example,'每天读两页。');
});
test('fabricated, rewritten, unknown and overly short quotes are rejected', () => {
 const result = parseExplanation(JSON.stringify({explanation:'解释', evidence:[{sourceId:'S1',quote:'每天坚持阅读二十分钟'},{sourceId:'S2',quote:'每天坚持阅读十分钟'},{sourceId:'S1',quote:'每天'}]}),sources);
 assert.deepEqual(result.evidence,[]);
});
test('old records without raw samples cannot use generated summaries as evidence', () => {
 assert.deepEqual(explanationSources({evidenceBriefs:[{summary:'伪原文'}]}),[]);
 assert.deepEqual(parseExplanation('{"explanation":"仅根据卡片解释"}',[]).evidence,[]);
});
test('empty, whitespace, long selections and boundary', () => {
 assert.ok(selectionError('   ')); assert.ok(selectionError('字'.repeat(801)));
 assert.equal(selectionError('字'.repeat(800)),''); assert.ok(selectionError(null));
});
test('model output cleanup and malformed/empty output failure', () => {
 assert.equal(parseExplanation('```json\n{"explanation":"解释"}\n```',[]).explanation,'解释');
 assert.throws(()=>parseExplanation('错误',[])); assert.throws(()=>parseExplanation('{"explanation":""}',[]));
});
