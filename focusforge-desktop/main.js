const { app, BrowserWindow, shell, Menu, globalShortcut } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false — safe because nodeIntegration is false and contextIsolation
      // is true. Sandbox + file:// blocks crossorigin script/CSS loading (no CORS
      // headers on file:// responses), causing a black window.
      sandbox: false,
    },
    title: 'Pixel',
    show: false,
  });

  Menu.setApplicationMenu(null);

  const webDir = app.isPackaged
    ? path.join(process.resourcesPath, 'electron-web')
    : path.join(__dirname, 'electron-web');
  win.loadFile(path.join(webDir, 'index.html'));

  win.once('ready-to-show', () => win.show());

  // F12 → DevTools (handy for diagnosing issues without a full dev build)
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
    }
  });

  // External links open in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
