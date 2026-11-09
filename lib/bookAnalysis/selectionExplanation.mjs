export const MAX_SELECTION_LENGTH = 800;
export function selectionError(text) {
  if (typeof text !== 'string' || !text.trim()) return '请选择非空白文字。';
  if ([...text.trim()].length > MAX_SELECTION_LENGTH) return '选中文字过长，请缩短至 800 字以内。';
  return '';
}

// Only raw samples, never summaries or generated card evidence, can back a quote.
export function explanationSources(context, selection = '') {
  const tokens = [...new Set(selection.match(/[\p{Script=Han}]{2,}|[a-zA-Z]{3,}/gu) ?? [])]
    .flatMap(token => /\p{Script=Han}/u.test(token) ? Array.from({length: token.length - 1}, (_, i) => token.slice(i, i + 2)) : [token.toLowerCase()]);
  return (Array.isArray(context?.samples) ? context.samples : [])
    .filter(s => typeof s.sourceId === 'string' && typeof s.chapterTitle === 'string' && Number.isInteger(s.chapterIndex) && typeof (s.text ?? s.preview) === 'string')
    .map(s => ({sourceId: s.sourceId, chapterTitle: s.chapterTitle, chapterIndex: s.chapterIndex, position: s.position, text: (s.text ?? s.preview).slice(0, 6000)}))
    .map(s => ({...s, score: tokens.reduce((n, t) => n + Number(s.text.toLowerCase().includes(t)), 0)}))
    .sort((a, b) => b.score - a.score).slice(0, 8);
}

export function parseExplanation(raw) {
  const data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (typeof data.explanation !== 'string' || !data.explanation.trim()) throw new Error('Invalid explanation');
  return {explanation: data.explanation.trim().slice(0, 2000), example: typeof data.example === 'string' ? data.example.trim().slice(0, 500) : ''};
}
