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
  // Pixel Flow AI task extraction
  proposeTasks: (text) => ipcRenderer.invoke('pixel-flow:propose', text),
  // Hide capture window
  hideCaptureWindow: () => ipcRenderer.send('hide-capture-window'),

  scheduleTaskNotification: (task) => ipcRenderer.invoke('notifications:schedule-task', task),
  cancelTaskNotification: (taskId) => ipcRenderer.invoke('notifications:cancel-task', taskId),
  rescheduleAllNotifications: (tasks) => ipcRenderer.invoke('notifications:reschedule-all', tasks),
  getScheduledNotifications: () => ipcRenderer.invoke('notifications:get-scheduled'),
  onTaskNotification: (callback) => {
    ipcRenderer.on('task-notification-triggered', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('task-notification-triggered', callback);
  }
});