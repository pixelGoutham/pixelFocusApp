// Preload script runs in a sandboxed renderer context.
// Pixel uses localforage (IndexedDB) for all storage — no Node.js APIs needed.
// This file is intentionally minimal.
const { contextBridge, ipcRenderer } = require('electron');

// Securely expose fullscreen IPC to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // Toggle fullscreen state
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  // Listen for enter fullscreen events
  onEnterFullscreen: (callback) => {
    ipcRenderer.on('did-enter-fullscreen', callback);
    return () => ipcRenderer.removeListener('did-enter-fullscreen', callback);
  },
  // Listen for leave fullscreen events
  onLeaveFullscreen: (callback) => {
    ipcRenderer.on('did-leave-fullscreen', callback);
    return () => ipcRenderer.removeListener('did-leave-fullscreen', callback);
  },
  // Discord Rich Presence
  setDiscordActivity: (activity) => ipcRenderer.send('set-discord-activity', activity),
  clearDiscordActivity: () => ipcRenderer.send('clear-discord-activity'),
});