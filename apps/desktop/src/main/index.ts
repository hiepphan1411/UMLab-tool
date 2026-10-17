import { BrowserWindow, Menu, app, nativeTheme, shell } from 'electron';
import { join } from 'node:path';
import { auth } from './auth.service';
import { database } from './db';
import { registerIpc } from './ipc';
import { presence } from './presence.service';
import { sync } from './sync.service';

const isDev = !app.isPackaged;
// Giao diện tiếng Việt: ô chọn ngày hiện dd/mm/yyyy, thông báo hệ thống tiếng Việt
app.commandLine.appendSwitch('lang', 'vi');

// Cho phép chạy nhiều bản (mỗi bản một userData) để thử cộng tác trên cùng máy: UMLAB_PROFILE=b npm run dev
if (process.env.UMLAB_PROFILE) {
  app.setPath('userData', join(app.getPath('userData'), 'profile-' + process.env.UMLAB_PROFILE));
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createWindow(): BrowserWindow {
  const dark = nativeTheme.shouldUseDarkColors;
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 600,
    minHeight: 480,
    show: false,
    title: 'UMLab',
    backgroundColor: dark ? '#15171C' : '#EEF0F3',
    icon: join(__dirname, '../../build/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? undefined
        : { color: dark ? '#1D2027' : '#FFFFFF', symbolColor: dark ? '#E5E8EF' : '#1B2130', height: 48 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !(devUrl && url.startsWith(devUrl))) e.preventDefault();
  });
  if (isDev && devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
  return win;
}

app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) {
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

app.whenReady().then(async () => {
  app.setAppUserModelId('vn.umlab.desktop');
  if (!isDev) Menu.setApplicationMenu(null);
  registerIpc(isDev);
  auth.restore();
  sync.init();
  presence.init();
  createWindow();
  await database.start();
  if (isDev && database.ready && !process.env.UMLAB_NO_SEED) {
    await auth.seedDemo().catch((e) => console.warn('[umlab] seed', e));
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let quitting = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  quitting = true;
  e.preventDefault();
  sync.dispose();
  const done = () => app.exit(0);
  presence
    .leaveAll()
    .catch(() => {})
    .finally(() => database.stop().finally(done));
  setTimeout(done, 2500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
