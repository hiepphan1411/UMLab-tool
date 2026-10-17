import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron';
import {
  IPC,
  type AppInfo,
  type ConnStatus,
  type PresenceState,
  type ProjectCreateInput,
  type ProjectInput,
  type ProjectStats,
  type Role,
} from '@shared/api';
import { assets } from './assets.service';
import { auth } from './auth.service';
import { paths } from './config';
import { database } from './db';
import { broadcast } from './events';
import { captureScreen, openFiles, saveFile } from './files';
import { local } from './local.service';
import { presence } from './presence.service';
import { projects } from './projects.service';
import { sync } from './sync.service';
import { versions } from './versions.service';
import { AppError, wrap } from './util';

type Handler = (...args: never[]) => unknown;
const handle = (channel: string, fn: Handler) =>
  ipcMain.handle(channel, (_e, ...args: unknown[]) => (fn as (...a: unknown[]) => unknown)(...args));

const toU8 = (v: unknown): Uint8Array => {
  if (v instanceof Uint8Array) return v;
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  throw new AppError('VALIDATION', 'Dữ liệu nhị phân không hợp lệ.');
};

export function registerIpc(isDev: boolean): void {
  database.onStatus((s) => broadcast(IPC.connStatusEvt, s));

  // ---------- app ----------
  handle(IPC.appInfo, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    userDataDir: paths.root,
    isDev,
  }));
  ipcMain.on(IPC.appTitleBar, (e, theme: { color: string; symbolColor: string }) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && process.platform !== 'darwin' && typeof win.setTitleBarOverlay === 'function') {
      try {
        win.setTitleBarOverlay({ color: theme.color, symbolColor: theme.symbolColor, height: 48 });
      } catch {}
    }
  });
  handle(IPC.appOpenExternal, async (url: string) => {
    if (/^https?:\/\//.test(String(url))) await shell.openExternal(String(url));
  });
  ipcMain.on(IPC.appReload, (e) => e.sender.reload());

  // ---------- kết nối ----------
  handle(IPC.connStatus, (): ConnStatus => database.current);
  handle(IPC.connRetry, async (): Promise<ConnStatus> => {
    await database.restart();
    return database.current;
  });

  // ---------- lưu trên máy (local-first) ----------
  handle(IPC.localDefaultDir, () => local.defaultDir());
  handle(IPC.localPickFolder, async (initial?: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const opts: Electron.OpenDialogOptions = {
      title: 'Chọn thư mục lưu project trên máy',
      defaultPath: typeof initial === 'string' && initial ? initial : local.defaultDir(),
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
    };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });
  handle(IPC.localReveal, (projectId: string) => {
    const e = local.get(String(projectId));
    if (e) shell.showItemInFolder(e.file);
  });
  handle(IPC.localMove, (projectId: string, dir: string) =>
    wrap(() => projects.moveLocal(String(projectId), String(dir))),
  );

  // ---------- auth ----------
  handle(IPC.authSession, () => auth.current());
  handle(IPC.authRegister, (input: { name: string; email: string; password: string }) =>
    wrap(() => auth.register(input)),
  );
  handle(IPC.authLogin, (input: { login: string; password: string; remember: boolean }) =>
    wrap(() => auth.login(input)),
  );
  handle(IPC.authLogout, async () => {
    await presence.leaveAll();
    projects.stopFeed();
    auth.logout();
  });
  handle(IPC.authLogoutAll, () =>
    wrap(async () => {
      await presence.leaveAll();
      projects.stopFeed();
      await auth.logoutAll();
    }),
  );
  handle(IPC.authUpdateProfile, (input: { name: string; color?: string }) => wrap(() => auth.updateProfile(input)));
  handle(IPC.authChangePassword, (input: { currentPassword: string; newPassword: string }) =>
    wrap(() => auth.changePassword(input)),
  );

  // ---------- project ----------
  handle(IPC.projList, () => wrap(() => projects.list()));
  handle(IPC.projGet, (id: string) => wrap(() => projects.get(String(id))));
  handle(IPC.projCreate, (input: ProjectCreateInput) =>
    wrap(() =>
      projects.create({ ...input, initialUpdate: input.initialUpdate ? toU8(input.initialUpdate) : undefined }),
    ),
  );
  handle(IPC.projUpdate, (id: string, patch: ProjectInput) => wrap(() => projects.update(String(id), patch)));
  handle(IPC.projRemove, (id: string) => wrap(() => projects.remove(String(id))));
  handle(IPC.projSetStats, async (id: string, stats: ProjectStats) => {
    await projects.setStats(String(id), stats).catch(() => {});
  });
  handle(IPC.projAddMember, (id: string, email: string, role: Role) =>
    wrap(() => projects.addMember(String(id), String(email), role)),
  );
  handle(IPC.projSetMemberRole, (id: string, userId: string, role: Role) =>
    wrap(() => projects.setMemberRole(String(id), String(userId), role)),
  );
  handle(IPC.projRemoveMember, (id: string, userId: string) =>
    wrap(() => projects.removeMember(String(id), String(userId))),
  );
  handle(IPC.projLoadUpdates, (id: string) => wrap(() => sync.loadAll(String(id))));

  // ---------- đồng bộ ----------
  handle(IPC.syncOpen, (projectId: string) => wrap(() => sync.openProject(String(projectId))));
  handle(IPC.syncPush, (projectId: string, update: Uint8Array) =>
    wrap(() => sync.push(String(projectId), toU8(update))),
  );
  handle(IPC.syncClose, (projectId: string) => sync.close(String(projectId)));
  ipcMain.on(IPC.presenceUpdate, (_e, projectId: string, state: PresenceState) =>
    presence.update(String(projectId), state),
  );

  // ---------- phiên bản & ảnh ----------
  handle(IPC.verList, (projectId: string, diagramId: string) =>
    wrap(() => versions.list(String(projectId), String(diagramId))),
  );
  handle(IPC.verSave, (projectId: string, diagramId: string, label: string, content: string) =>
    wrap(() => versions.save(String(projectId), String(diagramId), String(label), String(content))),
  );
  handle(IPC.verGet, (versionId: string) => wrap(() => versions.get(String(versionId))));
  handle(IPC.assetUpload, (projectId: string, file: { name: string; mime: string; bytes: Uint8Array }) =>
    wrap(() =>
      assets.upload(String(projectId), { name: String(file.name), mime: String(file.mime), bytes: toU8(file.bytes) }),
    ),
  );
  handle(IPC.assetGet, (assetId: string) => wrap(() => assets.get(String(assetId))));
  handle(IPC.assetList, (projectId: string) => wrap(() => assets.list(String(projectId))));

  // ---------- tệp ----------
  handle(
    IPC.fileSave,
    (input: { defaultName: string; filters?: { name: string; extensions: string[] }[]; data: string | Uint8Array }) =>
      saveFile({ ...input, data: typeof input.data === 'string' ? input.data : toU8(input.data) }),
  );
  handle(
    IPC.fileOpen,
    (input: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean; asText?: boolean }) =>
      openFiles(input),
  );
  handle(IPC.fileCaptureScreen, () => captureScreen());
}
