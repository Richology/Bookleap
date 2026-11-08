import { MAX_BYTES } from './protocol.mjs';
// Chrome validates the caller against the OS-registered allowed_origins manifest.
let input = Buffer.alloc(0);
process.stdin.on('data', async chunk => {
  input = Buffer.concat([input, chunk]);
  if (input.length > MAX_BYTES + 4) process.exit(1);
  if (input.length < 4) return;
  const size = input.readUInt32LE(0);
  if (size > MAX_BYTES) process.exit(1);
  if (input.length < size + 4) return;
  process.stdin.pause();
  let response;
  try {
    const message = JSON.parse(input.subarray(4, size + 4).toString());
    const request = message.request;
    if (message.origin !== 'https://www.bookleap.cn' || !['/pair','/status','/snapshot'].includes(request.route)) throw new Error();
    const result = await fetch(`http://127.0.0.1:48720${request.route}`, {method: request.route === '/status' ? 'GET' : 'POST', headers: {'Origin': message.origin, 'Content-Type': 'application/json', 'X-BookLeap-Protocol': '1', ...(request.token ? {Authorization: `Bearer ${request.token}`} : {})}, body: request.route === '/status' ? undefined : JSON.stringify(request.body), signal: AbortSignal.timeout(15000)});
    response = {status: result.status, body: await result.json()};
  } catch { response = {status: 503, body: {error: 'native_host_unavailable'}}; }
  const output = Buffer.from(JSON.stringify(response)), header = Buffer.alloc(4); header.writeUInt32LE(output.length);
  process.stdout.write(Buffer.concat([header, output]), () => process.exit(0));
});
