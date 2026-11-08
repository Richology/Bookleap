// Runs only on BookLeap. No storage, cookies, history or DOM scraping permissions.
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== 'https://www.bookleap.cn' || event.data?.channel !== 'bookleap-local-request' || typeof event.data.id !== 'string') return;
  const {id, request} = event.data;
  chrome.runtime.sendMessage({request}, response => {
    const error = chrome.runtime.lastError;
    window.postMessage({channel: 'bookleap-local-response', id, response: error ? {status: 503, body: {error: 'native_host_unavailable'}} : response}, event.origin);
  });
});
window.addEventListener('message', event => {
  if (event.source === window && event.origin === 'https://www.bookleap.cn' && event.data?.channel === 'bookleap-local-detect') window.postMessage({channel: 'bookleap-local-ready'}, event.origin);
});
