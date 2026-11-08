import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const PROTOCOL = 1;
export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
export const MAX_BYTES = 32 * 1024 * 1024;
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const id = z.string().min(1).max(160);
export const fragmentSchema = z.object({
  id, module: z.string().min(1).max(80), type: z.enum(['analysis', 'personal', 'evidence']),
  text: z.string().min(1).max(2000), evidence: z.string().max(12000).optional(),
}).strict();
export const bookSchema = z.object({
  sourceRecordId: id, title: z.string().min(1).max(500), author: z.string().max(300),
  format: z.enum(['epub', 'pdf', 'azw3', 'txt']), analysisVersion: z.string().max(100),
  fragments: z.array(fragmentSchema).max(3000),
}).strict();
export const scopeSchema = z.object({personal: z.boolean(), excludedIds: z.array(id).max(10000)}).strict();
export const snapshotSchema = z.object({
  schemaVersion: z.literal(PROTOCOL), kind: z.literal('complete-snapshot'), sourceId: z.string().uuid(),
  baseRevision: z.number().int().nonnegative(), requestId: z.string().uuid(),
  scope: scopeSchema, recordCount: z.number().int().nonnegative().max(10000),
  books: z.array(bookSchema).max(10000),
}).strict().superRefine((v, ctx) => {
  const ids = v.books.map(b => b.sourceRecordId);
  if (v.recordCount !== v.books.length || new Set(ids).size !== ids.length || v.books.some(b => new Set(b.fragments.map(f => f.id)).size !== b.fragments.length)) ctx.addIssue({code: 'custom', message: 'incomplete_or_duplicate_snapshot'});
  if (v.books.some(b => v.scope.excludedIds.includes(b.sourceRecordId) || (!v.scope.personal && b.fragments.some(f => f.type === 'personal')))) ctx.addIssue({code: 'custom', message: 'outside_scope'});
});
export class Fault extends Error { constructor(code, status = 400) { super(code); this.code = code; this.status = status; } }
