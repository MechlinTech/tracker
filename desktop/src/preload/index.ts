import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials: { email: string; password: string }) => 
    ipcRenderer.invoke('login', credentials),
  onTrackingStatusChange: (callback: (status: boolean) => void) =>
    ipcRenderer.on('tracking-status', (_, status) => callback(status))
});