const { app, BrowserWindow, shell, Menu } = require('electron');
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
    },
    title: 'Pixel',
    show: false,
  });

  Menu.setApplicationMenu(null);

  const webDir = app.isPackaged
    ? path.join(process.resourcesPath, 'electron-web')
    : path.join(__dirname, 'electron-web');

  const indexPath = path.join(webDir, 'index.html');
  win.loadFile(indexPath);

  // Show when rendered — fallback after 3s in case event misfires
  win.once('ready-to-show', () => win.show());
  setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) win.show(); }, 3000);

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Log load failures to help debug
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Load failed:', code, desc, indexPath);
    win.show(); // show anyway so user isn't stuck on black
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
