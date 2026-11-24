// The Electron build exposes the same API through its preload script.
if (window.__TAURI__) {
  const {core, event} = window.__TAURI__;
  window.bookleap = {
    invoke: (action, value) => core.invoke('bookleap', {action, value: value ?? null}),
    onCitation: async callback => {
      await event.listen('citation', () => takeCitation());
      async function takeCitation() {
        const id = await core.invoke('take_citation');
        if (id) callback(id);
      }
      await takeCitation();
    }
  };
}
