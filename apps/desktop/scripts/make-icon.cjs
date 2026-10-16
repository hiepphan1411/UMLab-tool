// Dựng build/icon.png (512×512) từ docs/assets/brand/umlab-icon.svg bằng Electron (không cần thư viện ảnh native).
// Chạy: npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = readFileSync(join(__dirname, '../../../docs/assets/brand/umlab-icon.svg'), 'utf8');
  const out = join(__dirname, '../build');
  mkdirSync(out, { recursive: true });
  for (const size of [512]) {
    const win = new BrowserWindow({ width: size, height: size, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
    const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="display:block;width:${size}px;height:${size}px" `)}</body></html>`;
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 300));
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    writeFileSync(join(out, 'icon.png'), img.resize({ width: size, height: size }).toPNG());
    win.destroy();
  }
  console.log('icon → build/icon.png');
  app.quit();
});
