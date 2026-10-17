import { BrowserWindow, desktopCapturer, dialog, screen } from 'electron';
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

/** Chụp màn hình chính: ẩn cửa sổ UMLab một nhịp để ảnh không chứa chính app, rồi hiện lại. */
export async function captureScreen(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const k = display.scaleFactor || 1;
  const wasVisible = !!win?.isVisible();
  try {
    if (win && wasVisible) {
      win.hide();
      await new Promise((r) => setTimeout(r, 350));
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(width * k), height: Math.round(height * k) },
    });
    const src = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!src || src.thumbnail.isEmpty()) return null;
    return src.thumbnail.toDataURL();
  } finally {
    if (win && wasVisible) {
      win.show();
      win.focus();
    }
  }
}
