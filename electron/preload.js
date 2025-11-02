import { contextBridge, ipcRenderer } from 'electron';
// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
    loadConfig: function () { return ipcRenderer.invoke('load-config'); },
    loadRepositories: function () { return ipcRenderer.invoke('load-repositories'); },
    loadUsers: function () { return ipcRenderer.invoke('load-users'); }
});
