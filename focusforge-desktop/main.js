const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

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
    title: 'FocusForge',
    show: false, // show only after content loads (no white flash)
  });

  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Load the built web app
  const indexPath = path.join(__dirname, '..', 'artifacts', 'focusforge', 'dist', 'electron-web', 'index.html');
  win.loadFile(indexPath);

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
