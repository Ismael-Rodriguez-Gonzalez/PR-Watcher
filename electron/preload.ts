import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  loadRepositories: () => ipcRenderer.invoke('load-repositories'),
  loadUsers: () => ipcRenderer.invoke('load-users'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url)
});
