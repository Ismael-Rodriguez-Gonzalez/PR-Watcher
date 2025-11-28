import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  loadRepositories: () => ipcRenderer.invoke('load-repositories'),
  loadUsers: () => ipcRenderer.invoke('load-users'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  saveConfig: (config: { githubToken: string; refreshInterval: number }) => ipcRenderer.invoke('save-config', config),
  loadRepoState: () => ipcRenderer.invoke('load-repo-state'),
  saveRepoState: (state: { lastUpdates: Record<string, number>; cachedPRs?: Record<string, any[]> }) => ipcRenderer.invoke('save-repo-state', state)
});
