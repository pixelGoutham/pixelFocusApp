// Preload script runs in a sandboxed renderer context.
// FocusForge uses localforage (IndexedDB) for all storage — no Node.js APIs needed.
// This file is intentionally minimal.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
