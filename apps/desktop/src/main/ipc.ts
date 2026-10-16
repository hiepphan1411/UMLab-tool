import { BrowserWindow, app, ipcMain, shell } from 'electron';
import {
  IPC,
  type AppInfo,
  type ConnStatus,
  type PresenceState,
  type ProjectInput,
  type ProjectStats,
  type Role,
} from '@shared/api';
import { assets } from './assets.service';
import { auth } from './auth.service';
import { hostOf, loadSettings, paths, saveSettings } from './config';
import { database, friendlyError } from './db';
import { broadcast } from './events';
import { openFiles, saveFile } from './files';
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
  handle(IPC.connGetSettings, () => {
    const s = loadSettings();
    return { mongoUri: s.usingBuiltIn ? '' : s.mongoUri, dbName: s.dbName, usingBuiltIn: s.usingBuiltIn };
  });
  handle(IPC.connSaveSettings, (input: { mongoUri: string; dbName: string } | null) =>
    wrap(async () => {
      saveSettings(input && input.mongoUri ? input : null);
      await database.restart();
      return database.current;
    }),
  );
  handle(IPC.connTest, (input: { mongoUri: string; dbName: string }) =>
    wrap(async () => {
      const { MongoClient } = await import('mongodb');
      const c = new MongoClient(String(input.mongoUri), { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
      try {
        await c.connect();
        const db = c.db(String(input.dbName || 'umlab'));
        await db.command({ ping: 1 });
        const hello = (await db.command({ hello: 1 })) as { setName?: string; msg?: string };
        return { realtime: !!hello.setName || hello.msg === 'isdbgrid', host: hostOf(String(input.mongoUri)) };
      } catch (e) {
        throw new AppError('OFFLINE', friendlyError(e instanceof Error ? e.message : String(e)));
      } finally {
        await c.close(true).catch(() => {});
      }
    }),
  );

  // ---------- auth ----------
  handle(IPC.authSession, () => auth.current());
  handle(IPC.authRegister, (input: { name: string; email: string; password: string }) =>
    wrap(() => auth.register(input)),
  );
  handle(IPC.authLogin, (input: { email: string; password: string; remember: boolean }) =>
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
  handle(IPC.projCreate, (input: ProjectInput & { initialUpdate?: Uint8Array }) =>
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
}
