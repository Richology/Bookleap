chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || sender.frameId !== 0 || new URL(sender.url).origin !== 'https://www.bookleap.cn') return false;
  const request = message.request;
  if (!request || !['/pair', '/status', '/snapshot'].includes(request.route)) return false;
  // Native hosts enforce the same fixed routing and origin; no arbitrary URL forwarding.
  chrome.runtime.sendNativeMessage('com.bookleap.local', {origin: 'https://www.bookleap.cn', request}, response => {
    const error = chrome.runtime.lastError;
    respond(error ? {status: 503, body: {error: 'native_host_unavailable'}} : response);
  });
  return true;
});
