import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';

/** Giả lập module electron cho test service ở main process (không mở cửa sổ). */
export const sent: { channel: string; args: unknown[] }[] = [];
const userData = mkdtempSync(join(tmpdir(), 'umlab-test-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.0.0-test', isPackaged: false },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: { send: (channel: string, ...args: unknown[]) => sent.push({ channel, args }) },
      },
    ],
    getFocusedWindow: () => null,
  },
  ipcMain: { handle: () => {}, on: () => {} },
  dialog: {},
  shell: {},
}));
