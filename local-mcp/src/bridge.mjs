import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { atomicWrite, assertSafePath } from './store.mjs';
import { Fault, hash, MAX_BYTES, PROTOCOL, VERSION } from './protocol.mjs';
const secret = () => randomBytes(32).toString('base64url');
const equal = (a, b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const pairSchema = z.object({sourceId: z.string().uuid(), sourceName: z.string().min(1).max(80), code: z.string().min(20).max(100), schemaVersion: z.literal(1)}).strict();
export class Bridge {
  constructor(store, {port = 48720, origins = ['https://www.bookleap.cn'], onPair = async () => false} = {}) {
    this.store = store; this.port = port; this.origins = origins; this.onPair = onPair;
    this.file = assertSafePath(path.join(store.root, 'pairs.json'));
    this.pairs = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : [];
    this.paused = false; this.pairing = null; this.pendingPair = false;
    this.activeRequests = 0;
    this.server = http.createServer((req, res) => {this.activeRequests++; void this.handle(req, res).finally(() => {this.activeRequests--;});});
    this.server.requestTimeout = 15000; this.server.headersTimeout = 10000;
  }
  createPairing() { this.pairing = {code: secret(), expires: Date.now() + 300000}; return {...this.pairing}; }
  async body(req) {
    if (req.headers['content-type'] !== 'application/json') throw new Fault('json_required', 415);
    let size = 0; const parts = [];
    for await (const part of req) { size += part.length; if (size > MAX_BYTES) throw new Fault('snapshot_too_large', 413); parts.push(part); }
    try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new Fault('invalid_json'); }
  }
  async handle(req, res) {
    const send = (status, data) => { res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data)); };
    try {
      if (req.headers.host !== `127.0.0.1:${this.port}` || !this.origins.includes(req.headers.origin)) throw new Fault('origin_or_host_denied', 403);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Vary', 'Origin'); res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-BookLeap-Protocol');
        res.writeHead(204).end(); return;
      }
      if (req.headers['x-bookleap-protocol'] !== String(PROTOCOL)) throw new Fault('upgrade_required', 426);
      if (req.url === '/pair' && req.method === 'POST') {
        const value = pairSchema.parse(await this.body(req));
        if (this.pendingPair || !this.pairing || Date.now() > this.pairing.expires || !equal(value.code, this.pairing.code)) throw new Fault('pairing_expired', 401);
        this.pendingPair = true;
        this.pairing = null; // One use, including denial.
        try {
          if (this.pairs.some(p => p.sourceId === value.sourceId)) throw new Fault('source_already_paired', 409);
          if (!(await this.onPair({sourceId: value.sourceId, sourceName: value.sourceName, origin: req.headers.origin}))) throw new Fault('pairing_denied', 403);
          const token = secret();
          const binding = {sourceId: value.sourceId, sourceName: value.sourceName, origin: req.headers.origin, tokenHash: hash(token)};
          const next = [...this.pairs, binding]; atomicWrite(this.file, JSON.stringify(next)); this.pairs = next;
          send(200, {token, ...this.store.status(value.sourceId), version: VERSION}); return;
        } finally { this.pendingPair = false; }
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      const binding = this.pairs.find(p => p.origin === req.headers.origin && equal(hash(token), p.tokenHash));
      if (!binding) throw new Fault('pairing_required', 401);
      if (req.method === 'GET' && req.url === '/status') { send(200, {...this.store.status(binding.sourceId), paused: this.paused, version: VERSION}); return; }
      if (req.method === 'POST' && req.url === '/snapshot') {
        if (this.paused) throw new Fault('paused', 423);
        send(200, this.store.commit(await this.body(req), binding)); return;
      }
      throw new Fault('not_found', 404);
    } catch (e) {
      // Do not return validation payloads, request bodies, secrets or paths.
      if (!res.headersSent) send(e.status ?? 400, {error: e.code && typeof e.code === 'string' ? e.code : 'invalid_request'});
      else res.end();
    }
  }
  listen() { return new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(this.port, '127.0.0.1', () => { this.port = this.server.address().port; resolve(); }); }); }
  close() { return new Promise(resolve => { this.server.close(resolve); this.server.closeAllConnections(); }); }
}
