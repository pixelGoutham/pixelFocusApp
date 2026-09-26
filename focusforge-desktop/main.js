const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');
const clientId = '1553306840522039316';

let rpc;
let rpcReady = false;

function initDiscordRPC() {
  DiscordRPC.register(clientId);
  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    rpcReady = true;
    console.log('Discord RPC Connected');
  });

  // Fails silently if Discord isn't open
  rpc.login({ clientId }).catch(() => console.log('Discord not running'));
}

function createWindow() {
  const win = new BrowserWindow({
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
    title: 'Pixel',
    show: false, // show only after content loads (no white flash)
  });

  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Both packaged and dev: electron-web lives next to main.js in focusforge-desktop/
  // When packaged, electron-builder copies it via extraResources -> resources/electron-web
  const webDir = app.isPackaged
    ? path.join(process.resourcesPath, 'electron-web')
    : path.join(__dirname, 'electron-web');
  win.loadFile(path.join(webDir, 'index.html'));
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

app.whenReady().then(() => {
  const win = createWindow();
  initDiscordRPC();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win2 = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});