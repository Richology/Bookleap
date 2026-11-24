// The Electron build exposes the same API through its preload script.
if (window.__TAURI__) {
  const {core, event} = window.__TAURI__;
  window.bookleap = {
    copyText: text => core.invoke('plugin:clipboard-manager|write_text', {text}),
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
