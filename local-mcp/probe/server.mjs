import http from 'node:http';
const origin = 'https://www.bookleap.cn';
http.createServer((req, res) => {
  if (req.headers.host !== '127.0.0.1:48721' || req.headers.origin !== origin) {
    res.writeHead(403).end(); return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-BookLeap-Probe');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({probe: 'bookleap-local-only', received: Boolean(req.headers['x-bookleap-probe'])}));
}).listen(48721, '127.0.0.1', () => console.error('Synthetic probe listening on loopback 48721'));
