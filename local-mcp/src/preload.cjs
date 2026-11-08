const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('bookleap', {
  onCitation: callback => ipcRenderer.on('citation', (_event, id) => callback(id)),
  invoke: (action, value) => ipcRenderer.invoke('bookleap', action, value),
});
