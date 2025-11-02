export interface IElectronAPI {
  loadConfig: () => Promise<{ githubToken: string; refreshInterval: number }>;
  loadRepositories: () => Promise<any[]>;
  loadUsers: () => Promise<any[]>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
