import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno desde .env y .env.local en desarrollo
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config(); // Carga .env
  require('dotenv').config({ path: '.env.local', override: true }); // Carga .env.local (tiene prioridad)
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // En desarrollo, carga desde Vite
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Descomentala si necesitas la consola
  } else {
    // En producción, carga el archivo HTML compilado
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers para leer archivos de configuración
ipcMain.handle('load-config', () => {
  try {
    // Prioridad 1: Variables de entorno del sistema
    const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const envRefreshInterval = process.env.REFRESH_INTERVAL ? parseInt(process.env.REFRESH_INTERVAL, 10) : null;

    if (envToken) {
      console.log('[Electron] Using GitHub token from environment variables');
      return {
        githubToken: envToken,
        refreshInterval: envRefreshInterval || 60
      };
    }

    // Prioridad 2: Archivo de configuración guardado por el usuario
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo: leer desde .env.local (ya cargado por dotenv)
      if (process.env.GITHUB_TOKEN) {
        console.log('[Electron] Using token from .env.local');
        return {
          githubToken: process.env.GITHUB_TOKEN,
          refreshInterval: process.env.REFRESH_INTERVAL ? parseInt(process.env.REFRESH_INTERVAL, 10) : 60
        };
      }
    } else {
      // En producción: leer desde userData
      const userDataPath = app.getPath('userData');
      const userConfigPath = path.join(userDataPath, 'user-config.json');

      if (fs.existsSync(userConfigPath)) {
        console.log('[Electron] Loading config from userData:', userConfigPath);
        const data = fs.readFileSync(userConfigPath, 'utf-8');
        const config = JSON.parse(data);
        console.log('[Electron] Config loaded from userData:', { hasToken: !!config.githubToken, refreshInterval: config.refreshInterval });
        return config;
      }
    }

    // Prioridad 3: Archivo config.json del proyecto (solo para refreshInterval)
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const configPath = path.join(basePath, 'config', 'config.json');

    if (fs.existsSync(configPath)) {
      console.log('[Electron] Loading project config from:', configPath);
      const data = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(data);
      console.log('[Electron] Project config loaded:', { hasToken: !!config.githubToken, refreshInterval: config.refreshInterval });
      return {
        githubToken: config.githubToken || '',
        refreshInterval: config.refreshInterval || 60
      };
    }

    // Prioridad 4: Configuración por defecto
    console.log('[Electron] Using default config - no token found');
    return { githubToken: '', refreshInterval: 60 };
  } catch (error) {
    console.error('[Electron] Error loading config:', error);
    return { githubToken: '', refreshInterval: 60 };
  }
});

ipcMain.handle('load-repositories', () => {
  try {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const reposPath = path.join(basePath, 'config', 'repos.json');
    console.log('[Electron] Loading repositories from:', reposPath);
    const data = fs.readFileSync(reposPath, 'utf-8');
    const parsed = JSON.parse(data);
    console.log('[Electron] Repositories loaded:', parsed.repos ? parsed.repos.length : 0);
    console.log('[Electron] Default refresh interval:', parsed.defaultRefreshInterval || 7200);
    return {
      repos: parsed.repos || [],
      defaultRefreshInterval: parsed.defaultRefreshInterval || 7200
    };
  } catch (error) {
    console.error('[Electron] Error loading repositories:', error);
    return { repos: [], defaultRefreshInterval: 7200 };
  }
});

ipcMain.handle('load-users', () => {
  try {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const usersPath = path.join(basePath, 'config', 'users.json');
    console.log('[Electron] Loading users from:', usersPath);
    const data = fs.readFileSync(usersPath, 'utf-8');
    const parsed = JSON.parse(data);
    console.log('[Electron] Users loaded:', parsed.users ? parsed.users.length : 0);
    return parsed.users || [];
  } catch (error) {
    console.error('[Electron] Error loading users:', error);
    return [];
  }
});

ipcMain.handle('open-external', async (_event, url: string) => {
  console.log('[Electron] Opening external URL:', url);
  try {
    await shell.openExternal(url);
    console.log('[Electron] Successfully opened URL');
  } catch (error) {
    console.error('[Electron] Error opening URL:', error);
    throw error;
  }
});

ipcMain.handle('save-config', async (_event, config: { githubToken: string; refreshInterval: number }) => {
  try {
    let configPath: string;

    if (process.env.NODE_ENV === 'development') {
      // En desarrollo: guardar en .env.local en la raíz del proyecto
      configPath = path.join(process.cwd(), '.env.local');

      // Leer .env.local existente si existe
      let envContent = '';
      if (fs.existsSync(configPath)) {
        envContent = fs.readFileSync(configPath, 'utf-8');
      }

      // Actualizar o añadir variables
      const lines = envContent.split('\n');
      let tokenUpdated = false;
      let intervalUpdated = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('GITHUB_TOKEN=')) {
          lines[i] = `GITHUB_TOKEN=${config.githubToken}`;
          tokenUpdated = true;
        } else if (lines[i].startsWith('REFRESH_INTERVAL=')) {
          lines[i] = `REFRESH_INTERVAL=${config.refreshInterval}`;
          intervalUpdated = true;
        }
      }

      if (!tokenUpdated) {
        lines.push(`GITHUB_TOKEN=${config.githubToken}`);
      }
      if (!intervalUpdated) {
        lines.push(`REFRESH_INTERVAL=${config.refreshInterval}`);
      }

      // Guardar .env.local
      const newEnvContent = lines.filter(line => line.trim() !== '').join('\n') + '\n';
      console.log('[Electron] Saving token to:', configPath);
      fs.writeFileSync(configPath, newEnvContent, 'utf-8');

      // Recargar variables de entorno
      require('dotenv').config({ path: configPath, override: true });

      console.log('[Electron] Token saved successfully to .env.local');
    } else {
      // En producción: guardar en userData como JSON
      const userDataPath = app.getPath('userData');
      configPath = path.join(userDataPath, 'user-config.json');

      console.log('[Electron] Saving config to:', configPath);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[Electron] Config saved successfully to userData');
    }

    return { success: true };
  } catch (error) {
    console.error('[Electron] Error saving config:', error);
    throw error;
  }
});

// IPC Handlers para el estado de los repositorios (timestamps y PRs cacheadas)
ipcMain.handle('load-repo-state', () => {
  try {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const statePath = path.join(basePath, 'config', 'repo-state.json');

    if (fs.existsSync(statePath)) {
      console.log('[Electron] Loading repo state from:', statePath);
      const data = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(data);
      console.log('[Electron] Repo state loaded:', Object.keys(state.lastUpdates || {}).length, 'repos');
      const cachedPRCount = Object.values(state.cachedPRs || {}).reduce((total: number, prs: any) => total + prs.length, 0);
      console.log('[Electron] Cached PRs loaded:', cachedPRCount, 'PRs');
      return state;
    }

    console.log('[Electron] No repo state file found, returning empty state');
    return { lastUpdates: {}, cachedPRs: {} };
  } catch (error) {
    console.error('[Electron] Error loading repo state:', error);
    return { lastUpdates: {}, cachedPRs: {} };
  }
});

ipcMain.handle('save-repo-state', async (_event, state: { lastUpdates: Record<string, number>; cachedPRs?: Record<string, any[]> }) => {
  try {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const statePath = path.join(basePath, 'config', 'repo-state.json');

    console.log('[Electron] Saving repo state to:', statePath);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    console.log('[Electron] Repo state saved:', Object.keys(state.lastUpdates || {}).length, 'repos');
    const cachedPRCount = Object.values(state.cachedPRs || {}).reduce((total: number, prs: any) => total + prs.length, 0);
    console.log('[Electron] Cached PRs saved:', cachedPRCount, 'PRs');

    return { success: true };
  } catch (error) {
    console.error('[Electron] Error saving repo state:', error);
    throw error;
  }
});
