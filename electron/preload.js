// CommonJS preload script for Electron renderer process
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Electron Preload] Initializing preload script (js) at:', new Date().toISOString());

const electronAPI = {
  isElectron: true,
  platform: process.platform,

  toggleFullscreen: async () => ipcRenderer.invoke('window:toggle-fullscreen'),
  setFullscreen: async (flag) => ipcRenderer.invoke('window:set-fullscreen', flag),
  isFullscreen: async () => ipcRenderer.invoke('window:is-fullscreen'),
  minimize: async () => ipcRenderer.invoke('window:minimize'),
  maximize: async () => ipcRenderer.invoke('window:maximize'),
  close: async () => ipcRenderer.invoke('window:close'),
  onFullscreenChange: (callback) => {
    const handler = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
  },

  saveLocal: async (slotId, saveData) => ipcRenderer.invoke('save:write', { slotId, saveData }),
  loadLocal: async (slotId) => ipcRenderer.invoke('save:read', slotId),
  listLocalSaves: async () => ipcRenderer.invoke('save:list'),
  deleteLocalSave: async (slotId) => ipcRenderer.invoke('save:delete', slotId),
  getSaveDirectoryPath: async () => ipcRenderer.invoke('save:get-directory'),
  openSaveDirectory: async () => ipcRenderer.invoke('save:open-directory'),

  exportSaveFileDialog: async (saveData, defaultName) => ipcRenderer.invoke('dialog:export-save', { saveData, defaultName }),
  importSaveFileDialog: async () => ipcRenderer.invoke('dialog:import-save'),

  getAppInfo: async () => ipcRenderer.invoke('app:get-info'),
};

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('[Electron Preload] Successfully exposed window.electronAPI via contextBridge');
} catch (err) {
  console.warn('[Electron Preload] contextBridge unavailable, attaching directly to window:', err);
  window.electronAPI = electronAPI;
}
