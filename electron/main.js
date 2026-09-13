import { app, BrowserWindow, ipcMain, dialog, screen, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine execution environment
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const DEV_PORT = process.env.PORT || 3000;
const DEV_URL = process.env.ELECTRON_DEV_URL || `http://localhost:${DEV_PORT}`;

let mainWindow = null;

// Ensure dedicated local saves directory in user data path
const SAVES_DIR = path.join(app.getPath('userData'), 'saves');
try {
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
} catch (err) {
  console.error('[Electron Main] Failed to initialize saves directory:', err);
}

// Locate application icon
function getAppIconPath() {
  const icoCandidate = path.join(__dirname, '../build/icon.ico');
  const pngCandidate = path.join(__dirname, '../build/icon.png');
  const publicCandidate = path.join(__dirname, '../public/icon.png');

  if (process.platform === 'win32' && fs.existsSync(icoCandidate)) {
    return icoCandidate;
  }
  if (fs.existsSync(pngCandidate)) {
    return pngCandidate;
  }
  if (fs.existsSync(publicCandidate)) {
    return publicCandidate;
  }
  return undefined;
}

/**
 * Creates the primary game window
 */
function createMainWindow() {
  const iconPath = getAppIconPath();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Sizing: adaptive 16:9 / 16:10 aspect desktop viewport
  const targetWidth = Math.min(1440, Math.floor(screenWidth * 0.9));
  const targetHeight = Math.min(900, Math.floor(screenHeight * 0.9));

  mainWindow = new BrowserWindow({
    title: 'Head Over Heels II - Station Overmind',
    width: targetWidth,
    height: targetHeight,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0a14',
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false, // Ensures game loop does not stutter in background
    },
  });

  // Handle window readiness: show without white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Fullscreen state notification events to renderer
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', false);
  });

  // Prevent in-app navigation away from the game
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalFile = url.startsWith('file://');
    const isLocalDev = url.startsWith(DEV_URL);
    if (!isLocalFile && !isLocalDev) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Load production bundle or development server
  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (!isDev && fs.existsSync(distHtmlPath)) {
    // Production Mode: Load local packaged HTML bundle
    mainWindow.loadFile(distHtmlPath);
  } else {
    // Development Mode: Try dev server, fallback to dist/index.html if available
    mainWindow.loadURL(DEV_URL).catch((err) => {
      console.warn(`[Electron] Dev server at ${DEV_URL} not reachable, falling back to dist:`, err.message);
      if (fs.existsSync(distHtmlPath)) {
        mainWindow.loadFile(distHtmlPath);
      } else {
        mainWindow.loadURL(DEV_URL);
      }
    });
  }

  // Register native application menu
  createApplicationMenu();
}

/**
 * Builds native application menu bar with Fullscreen, Zoom, and Save helpers
 */
function createApplicationMenu() {
  const template = [
    {
      label: 'Game',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        {
          label: 'Open Saves Folder',
          click: () => {
            shell.openPath(SAVES_DIR);
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Head Over Heels II',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Head Over Heels II',
              message: 'Head Over Heels II: Station Overmind',
              detail: 'Isometric Retro Sci-Fi Action-Adventure Desktop Edition.\nBuilt with Electron, Vite & React.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==========================================
// IPC HANDLERS: Window Controls & Fullscreen
// ==========================================

ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});

ipcMain.handle('window:set-fullscreen', (_event, flag) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(Boolean(flag));
  return mainWindow.isFullScreen();
});

ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
  return true;
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
  return true;
});

// ==========================================
// IPC HANDLERS: Local Save Files System
// ==========================================

ipcMain.handle('save:write', async (_event, { slotId, saveData }) => {
  try {
    const filename = `${slotId || 'slot_01'}.json`;
    const targetPath = path.join(SAVES_DIR, filename);
    const backupPath = path.join(SAVES_DIR, `${slotId || 'slot_01'}.bak`);

    const jsonContent = typeof saveData === 'string' ? saveData : JSON.stringify(saveData, null, 2);

    // Create safe backup of prior state if it exists
    if (fs.existsSync(targetPath)) {
      try {
        fs.copyFileSync(targetPath, backupPath);
      } catch (backupErr) {
        console.warn('[Electron Save] Non-fatal backup copy notice:', backupErr);
      }
    }

    fs.writeFileSync(targetPath, jsonContent, 'utf8');
    return {
      success: true,
      filePath: targetPath,
      timestamp: Date.now(),
      slotId,
    };
  } catch (error) {
    console.error('[Electron Save] Write error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('save:read', async (_event, slotId) => {
  try {
    const filename = `${slotId || 'slot_01'}.json`;
    const targetPath = path.join(SAVES_DIR, filename);

    if (!fs.existsSync(targetPath)) {
      return { success: false, error: 'Save file does not exist' };
    }

    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      success: true,
      data: parsed,
      filePath: targetPath,
    };
  } catch (error) {
    console.error('[Electron Save] Read error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('save:list', async () => {
  try {
    const files = fs.readdirSync(SAVES_DIR);
    const saves = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = path.join(SAVES_DIR, file);
        const stats = fs.statSync(fullPath);
        const slotId = path.basename(file, '.json');
        saves.push({
          slotId,
          fileName: file,
          fullPath,
          sizeBytes: stats.size,
          updatedAt: stats.mtimeMs,
        });
      }
    }

    // Sort newest first
    saves.sort((a, b) => b.updatedAt - a.updatedAt);
    return { success: true, saves, directory: SAVES_DIR };
  } catch (error) {
    return { success: false, error: String(error), saves: [] };
  }
});

ipcMain.handle('save:delete', async (_event, slotId) => {
  try {
    const filename = `${slotId}.json`;
    const targetPath = path.join(SAVES_DIR, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('save:get-directory', () => {
  return SAVES_DIR;
});

ipcMain.handle('save:open-directory', () => {
  shell.openPath(SAVES_DIR);
  return true;
});

// ==========================================
// IPC HANDLERS: Native OS File Dialogs
// ==========================================

ipcMain.handle('dialog:export-save', async (_event, { saveData, defaultName }) => {
  if (!mainWindow) return { canceled: true };

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Head Over Heels II Station State',
    defaultPath: defaultName || 'headoverheels2_station_save.json',
    filters: [
      { name: 'Station Save File (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    const text = typeof saveData === 'string' ? saveData : JSON.stringify(saveData, null, 2);
    fs.writeFileSync(result.filePath, text, 'utf8');
    return { canceled: false, success: true, filePath: result.filePath };
  } catch (err) {
    return {
      canceled: false,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

ipcMain.handle('dialog:import-save', async () => {
  if (!mainWindow) return { canceled: true };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Head Over Heels II Station State',
    properties: ['openFile'],
    filters: [
      { name: 'Station Save File (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const selectedPath = result.filePaths[0];
    const content = fs.readFileSync(selectedPath, 'utf8');
    return { canceled: false, success: true, content, filePath: selectedPath };
  } catch (err) {
    return {
      canceled: false,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

ipcMain.handle('app:get-info', () => {
  return {
    name: 'Head Over Heels II',
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath('userData'),
    savesDirectory: SAVES_DIR,
    isPackaged: app.isPackaged,
  };
});

// ==========================================
// SINGLE INSTANCE LOCK & APP LIFECYCLE
// ==========================================

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
