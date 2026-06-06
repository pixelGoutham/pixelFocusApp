// Preload script runs in a sandboxed renderer context.
// Pixel uses localforage (IndexedDB) for all storage — no Node.js APIs needed.
// This file is intentionally minimal.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
