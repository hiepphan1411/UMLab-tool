import { BrowserWindow } from 'electron';

/** Gửi sự kiện tới mọi cửa sổ renderer. */
export function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args);
  }
}
