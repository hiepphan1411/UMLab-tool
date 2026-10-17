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

/** Màn hình chờ (logo + hiệu ứng load) khi chạy bản cài; dev / e2e bỏ qua trừ khi đặt UMLAB_SPLASH=1. */
function createSplash(): BrowserWindow | null {
  const want = process.env.UMLAB_SPLASH ? process.env.UMLAB_SPLASH === '1' : app.isPackaged;
  if (!want) return null;
  const splash = new BrowserWindow({
    width: 380,
    height: 340,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    center: true,
    title: 'UMLab',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  splash.once('ready-to-show', () => splash.show());
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (isDev && devUrl) void splash.loadURL(devUrl + '/splash.html');
  else void splash.loadFile(join(__dirname, '../renderer/splash.html'));
  return splash;
}

/** Hiện cửa sổ chính, đóng màn hình chờ (giữ màn hình chờ tối thiểu ~1,2 s để hiệu ứng không chớp tắt). */
function revealAfterSplash(win: BrowserWindow, splash: BrowserWindow | null, since: number): void {
  if (!splash || splash.isDestroyed()) return win.show();
  setTimeout(
    () => {
      if (!win.isDestroyed()) win.show();
      if (!splash.isDestroyed()) splash.destroy();
    },
    Math.max(0, 1200 - (Date.now() - since)),
  );
}

function createWindow(splash: BrowserWindow | null = null): BrowserWindow {
  const since = Date.now();
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
  win.once('ready-to-show', () => revealAfterSplash(win, splash, since));
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
  const splash = createSplash();
  registerIpc(isDev);
  auth.restore();
  sync.init();
  presence.init();
  createWindow(splash);
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
