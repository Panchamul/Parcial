const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Mantener referencia global de la ventana
let mainWindow;

function createWindow() {
    // Crear la ventana principal
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'), // Opcional: ícono de la app
        titleBarStyle: 'default',
        show: false // No mostrar hasta que esté lista
    });

    // Cargar tu archivo HTML
    mainWindow.loadFile('src/index.html');

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Abrir DevTools en desarrollo (opcional)
    // Detecta si estás en modo desarrollo chequeando si no está empaquetado
    // if (!app.isPackaged) {
    //     mainWindow.webContents.openDevTools();
    // }

    // Evento cuando se cierra la ventana
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Este método se llama cuando Electron ha terminado de inicializarse
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Manejar operaciones de archivos JSON desde el renderer
ipcMain.handle('read-json-file', async (event, fileName) => {
    try {
        const filePath = path.join(__dirname, 'src', fileName);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo archivo:', error);
        return null;
    }
});

ipcMain.handle('write-json-file', async (event, fileName, data) => {
    try {
        const filePath = path.join(__dirname, 'src', fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error escribiendo archivo:', error);
        return false;
    }
});

// Manejar exportación de playlist
ipcMain.handle('export-playlist', async (event, songs) => {
    try {
        const { dialog } = require('electron');
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Exportar Playlist',
            defaultPath: 'mi-playlist.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, JSON.stringify(songs, null, 2));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error exportando playlist:', error);
        return false;
    }
});

// Manejar apertura de URLs externas de forma segura
ipcMain.handle('open-external-url', async (event, url) => {
    try {
        const { shell } = require('electron');
        
        // Validar que sea una URL válida
        const urlObj = new URL(url);
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
            await shell.openExternal(url);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error abriendo URL externa:', error);
        return false;
    }
});

// Opcional: Manejar el menú de la aplicación
const { Menu } = require('electron');

const template = [
    {
        label: 'Archivo',
        submenu: [
            {
                label: 'Salir',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Ver',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);