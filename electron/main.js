import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
var mainWindow = null;
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
        mainWindow.webContents.openDevTools();
    }
    else {
        // En producción, carga el archivo HTML generado
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC Handlers para leer archivos de configuración
ipcMain.handle('load-config', function () {
    try {
        // En desarrollo, usa process.cwd(), en producción usa app.getAppPath()
        var basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
        var configPath = path.join(basePath, 'config.json');
        var data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error loading config:', error);
        return { githubToken: '', refreshInterval: 60 };
    }
});
ipcMain.handle('load-repositories', function () {
    try {
        var basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
        var reposPath = path.join(basePath, 'repos.json');
        var data = fs.readFileSync(reposPath, 'utf-8');
        var parsed = JSON.parse(data);
        return parsed.repos || [];
    }
    catch (error) {
        console.error('Error loading repositories:', error);
        return [];
    }
});
ipcMain.handle('load-users', function () {
    try {
        var basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
        var usersPath = path.join(basePath, 'users.json');
        var data = fs.readFileSync(usersPath, 'utf-8');
        var parsed = JSON.parse(data);
        return parsed.users || [];
    }
    catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
});
