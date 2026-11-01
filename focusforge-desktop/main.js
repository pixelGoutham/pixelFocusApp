try { process.loadEnvFile(); } catch (e) {}

const { app, BrowserWindow, shell, Menu, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');
const { extractTasksFromText } = require('./pixelFlowService');

const clientId = '1553306840522039316';

let rpc;
let rpcReady = false;
let captureWindow = null;

function initDiscordRPC() {
  DiscordRPC.register(clientId);
  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    rpcReady = true;
    console.log('Discord RPC Connected');
  });
  // meow
  // Fails silently if Discord isn't open
  rpc.login({ clientId }).catch(() => console.log('Discord not running'));
}

function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'), 'logo', 'logo_dark.ico'),
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#09090b', // OLED black — prevents white flash on load
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Pixel Focus',
    show: false, // show only after content loads (no white flash)
  });

  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Load URL based on environment
  if (process.env.NODE_ENV === 'development' && !app.isPackaged) {
    // Load from Vite dev server
    const port = process.env.PORT || 5173;
    win.loadURL(`http://localhost:${port}`);
  } else {
    // Both packaged and dev: electron-web lives next to main.js in focusforge-desktop/
    // When packaged, electron-builder copies it via extraResources -> resources/electron-web
    const webDir = app.isPackaged
      ? path.join(process.resourcesPath, 'electron-web')
      : path.join(__dirname, 'electron-web');
    win.loadFile(path.join(webDir, 'index.html'));
  }

  // Open DevTools only in development (not packaged)
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Show window once content is ready (prevents white flash)
  win.once('ready-to-show', () => win.show());

  // Open external links in system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Setup fullscreen state synchronization
  setupFullscreenSync(win);

  return win;
}

// Create secondary capture window for Pixel Flow quick capture
function createCaptureWindow() {
  const captureWin = new BrowserWindow({
    width: 600,
    height: 150,
    minHeight: 150,
    maxHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the quick capture route
  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
  if (isDev) {
    const port = process.env.PORT || 5173;
    captureWin.loadURL(`http://localhost:${port}/#/quick-capture`);
  } else {
    const webDir = app.isPackaged
      ? path.join(process.resourcesPath, 'electron-web')
      : path.join(__dirname, 'electron-web');
    captureWin.loadFile(`file://${path.join(webDir, 'index.html')}#/quick-capture`);
  }

  // Don't show DevTools for capture window
  // if (!app.isPackaged) {
  //   captureWin.webContents.openDevTools({ mode: 'detach' });
  // }

  return captureWin;
}

// Handle fullscreen toggling via IPC from renderer
ipcMain.handle('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!win.isFullScreen());
  }
});

// Sync fullscreen state from Electron to renderer
function setupFullscreenSync(win) {
  win.on('enter-full-screen', () => {
    win.webContents.send('did-enter-fullscreen');
  });

  win.on('leave-full-screen', () => {
    win.webContents.send('did-leave-fullscreen');
  });
}

ipcMain.on('set-discord-activity', (event, activityData) => {
  if (!rpcReady || !rpc) return;

  rpc.setActivity({
    details: activityData.details,
    state: activityData.state,
    startTimestamp: activityData.startTimestamp,
    largeImageKey: 'logo_dark',
    largeImageText: 'PixelFocus',
    instance: false,
  }).catch(console.error);
});

ipcMain.on('clear-discord-activity', () => {
  if (!rpcReady || !rpc) return;
  rpc.clearActivity().catch(console.error);
});

// Pixel Flow AI task extraction
ipcMain.handle('pixel-flow:propose', async (event, userInput) => {
  try {
    const tasks = await extractTasksFromText(userInput);
    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error in pixel-flow:propose:', error);
    return { success: false, error: error.message };
  }
});

// Hide capture window
ipcMain.on('hide-capture-window', (event) => {
  if (captureWindow) {
    captureWindow.hide();
  }
});

app.whenReady().then(() => {
  const win = createWindow();
  initDiscordRPC();

  // Create capture window
  captureWindow = createCaptureWindow();

  // Register global shortcut for Pixel Flow capture
  const shortcut = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (captureWindow) {
      captureWindow.show();
      captureWindow.focus();
    }
  });

  if (!shortcut) {
    console.log('Global shortcut registration failed');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win2 = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});