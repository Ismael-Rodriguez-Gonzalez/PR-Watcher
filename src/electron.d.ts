export interface IElectronAPI {
  loadConfig: () => Promise<{ githubToken: string; refreshInterval: number }>;
  loadRepositories: () => Promise<{ repos: any[]; defaultRefreshInterval: number }>;
  loadUsers: () => Promise<any[]>;
  openExternal: (url: string) => Promise<void>;
  saveConfig: (config: { githubToken: string; refreshInterval: number }) => Promise<{ success: boolean }>;
  loadRepoState: () => Promise<{ lastUpdates: Record<string, number>; cachedPRs?: Record<string, any[]> }>;
  saveRepoState: (state: { lastUpdates: Record<string, number>; cachedPRs?: Record<string, any[]> }) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
