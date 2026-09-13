import { contextBridge, ipcRenderer } from 'electron';

/**
 * Head Over Heels II - Desktop Preload Bridge
 * Exposes secure IPC channels between Electron main process and React renderer.
 */

const electronAPI = {
  isElectron: true,
  platform: process.platform,

  // --- Fullscreen & Window Controls ---
  toggleFullscreen: async () => {
    return await ipcRenderer.invoke('window:toggle-fullscreen');
  },
  setFullscreen: async (flag) => {
    return await ipcRenderer.invoke('window:set-fullscreen', flag);
  },
  isFullscreen: async () => {
    return await ipcRenderer.invoke('window:is-fullscreen');
  },
  minimize: async () => {
    return await ipcRenderer.invoke('window:minimize');
  },
  maximize: async () => {
    return await ipcRenderer.invoke('window:maximize');
  },
  close: async () => {
    return await ipcRenderer.invoke('window:close');
  },
  onFullscreenChange: (callback) => {
    const handler = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
  },

  // --- Native Local Save Files System ---
  saveLocal: async (slotId, saveData) => {
    return await ipcRenderer.invoke('save:write', { slotId, saveData });
  },
  loadLocal: async (slotId) => {
    return await ipcRenderer.invoke('save:read', slotId);
  },
  listLocalSaves: async () => {
    return await ipcRenderer.invoke('save:list');
  },
  deleteLocalSave: async (slotId) => {
    return await ipcRenderer.invoke('save:delete', slotId);
  },
  getSaveDirectoryPath: async () => {
    return await ipcRenderer.invoke('save:get-directory');
  },
  openSaveDirectory: async () => {
    return await ipcRenderer.invoke('save:open-directory');
  },

  // --- Native OS File Dialogs for Export / Import ---
  exportSaveFileDialog: async (saveData, defaultName) => {
    return await ipcRenderer.invoke('dialog:export-save', { saveData, defaultName });
  },
  importSaveFileDialog: async () => {
    return await ipcRenderer.invoke('dialog:import-save');
  },

  // --- System & Application Info ---
  getAppInfo: async () => {
    return await ipcRenderer.invoke('app:get-info');
  },
};

// Safely expose in main world via contextBridge
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
} catch (err) {
  console.warn('[Electron Preload] contextBridge unavailable, attaching directly to window:', err);
  window.electronAPI = electronAPI;
}
