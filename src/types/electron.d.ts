/**
 * Type declarations for Electron desktop IPC bridge
 */

export interface LocalSaveSlotInfo {
  slotId: string;
  fileName: string;
  fullPath: string;
  sizeBytes: number;
  updatedAt: number;
}

export interface ElectronAPIBridge {
  isElectron: boolean;
  platform: string;

  // Window & Fullscreen controls
  toggleFullscreen: () => Promise<boolean>;
  setFullscreen: (flag: boolean) => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  minimize: () => Promise<boolean>;
  maximize: () => Promise<boolean>;
  close: () => Promise<boolean>;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;

  // Local Save File System
  saveLocal: (slotId: string, saveData: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadLocal: (slotId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  listLocalSaves: () => Promise<{ success: boolean; saves: LocalSaveSlotInfo[]; directory?: string; error?: string }>;
  deleteLocalSave: (slotId: string) => Promise<{ success: boolean; error?: string }>;
  getSaveDirectoryPath: () => Promise<string>;
  openSaveDirectory: () => Promise<boolean>;

  // Native File Dialogs
  exportSaveFileDialog: (saveData: any, defaultName?: string) => Promise<{ canceled: boolean; success?: boolean; filePath?: string; error?: string }>;
  importSaveFileDialog: () => Promise<{ canceled: boolean; success?: boolean; content?: string; filePath?: string; error?: string }>;

  // System
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
    userDataPath: string;
    savesDirectory: string;
    isPackaged: boolean;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPIBridge;
  }
}
