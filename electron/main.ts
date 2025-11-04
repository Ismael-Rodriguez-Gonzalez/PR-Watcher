import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno desde .env en desarrollo
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
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
    // Prioridad 1: Variables de entorno
    const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const envRefreshInterval = process.env.REFRESH_INTERVAL ? parseInt(process.env.REFRESH_INTERVAL, 10) : null;

    if (envToken) {
      console.log('[Electron] Using GitHub token from environment variables');
      return {
        githubToken: envToken,
        refreshInterval: envRefreshInterval || 60
      };
    }

    // Prioridad 2: Archivo de configuración
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const configPath = path.join(basePath, 'config', 'config.json');

    if (fs.existsSync(configPath)) {
      console.log('[Electron] Loading config from file:', configPath);
      const data = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(data);
      console.log('[Electron] Config loaded from file:', { hasToken: !!config.githubToken, refreshInterval: config.refreshInterval });
      return config;
    }

    // Prioridad 3: Configuración por defecto
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
    return parsed.repos || [];
  } catch (error) {
    console.error('[Electron] Error loading repositories:', error);
    return [];
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
