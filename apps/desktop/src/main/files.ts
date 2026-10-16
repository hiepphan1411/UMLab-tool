import { BrowserWindow, dialog } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { FileFilter, OpenedFile } from '@shared/api';

const MAX_OPEN_BYTES = 10 * 1024 * 1024;

export async function saveFile(input: {
  defaultName: string;
  filters?: FileFilter[];
  data: string | Uint8Array;
}): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined;
  const opts = { defaultPath: input.defaultName, filters: input.filters };
  const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts);
  if (res.canceled || !res.filePath) return null;
  await writeFile(res.filePath, typeof input.data === 'string' ? input.data : Buffer.from(input.data));
  return res.filePath;
}

export async function openFiles(input: {
  filters?: FileFilter[];
  multiple?: boolean;
  asText?: boolean;
}): Promise<OpenedFile[]> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined;
  const opts: Electron.OpenDialogOptions = {
    filters: input.filters,
    properties: input.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  };
  const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
  if (res.canceled) return [];
  const out: OpenedFile[] = [];
  for (const p of res.filePaths) {
    const buf = await readFile(p);
    if (buf.byteLength > MAX_OPEN_BYTES) throw new Error(`Tệp ${basename(p)} vượt quá 10 MB.`);
    out.push(
      input.asText
        ? { name: basename(p), path: p, text: buf.toString('utf8') }
        : { name: basename(p), path: p, bytes: new Uint8Array(buf) },
    );
  }
  return out;
}
