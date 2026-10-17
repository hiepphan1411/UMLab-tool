import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type UmlabApi } from '../shared/api';

const invoke = <T>(channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args) as Promise<T>;

function on<A extends unknown[]>(channel: string, cb: (...args: A) => void): () => void {
  const fn = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...(args as A));
  ipcRenderer.on(channel, fn);
  return () => {
    ipcRenderer.removeListener(channel, fn);
  };
}

const api: UmlabApi = {
  app: {
    info: () => invoke(IPC.appInfo),
    setTitleBarTheme: (theme) => ipcRenderer.send(IPC.appTitleBar, theme),
    openExternal: (url) => invoke(IPC.appOpenExternal, url),
    reload: () => ipcRenderer.send(IPC.appReload),
  },
  conn: {
    status: () => invoke(IPC.connStatus),
    onStatus: (cb) => on(IPC.connStatusEvt, cb),
    getSettings: () => invoke(IPC.connGetSettings),
    saveSettings: (input) => invoke(IPC.connSaveSettings, input),
    test: (input) => invoke(IPC.connTest, input),
  },
  auth: {
    session: () => invoke(IPC.authSession),
    register: (input) => invoke(IPC.authRegister, input),
    login: (input) => invoke(IPC.authLogin, input),
    logout: () => invoke(IPC.authLogout),
    logoutAll: () => invoke(IPC.authLogoutAll),
    updateProfile: (input) => invoke(IPC.authUpdateProfile, input),
    changePassword: (input) => invoke(IPC.authChangePassword, input),
    onSessionEnded: (cb) => on(IPC.authEndedEvt, cb),
  },
  projects: {
    list: () => invoke(IPC.projList),
    get: (id) => invoke(IPC.projGet, id),
    create: (input) => invoke(IPC.projCreate, input),
    update: (id, patch) => invoke(IPC.projUpdate, id, patch),
    remove: (id) => invoke(IPC.projRemove, id),
    setStats: (id, stats) => invoke(IPC.projSetStats, id, stats),
    addMember: (id, email, role) => invoke(IPC.projAddMember, id, email, role),
    setMemberRole: (id, userId, role) => invoke(IPC.projSetMemberRole, id, userId, role),
    removeMember: (id, userId) => invoke(IPC.projRemoveMember, id, userId),
    loadUpdates: (id) => invoke(IPC.projLoadUpdates, id),
    onChanged: (cb) => on(IPC.projChangedEvt, cb),
  },
  sync: {
    open: (projectId) => invoke(IPC.syncOpen, projectId),
    push: (projectId, update) => invoke(IPC.syncPush, projectId, update),
    close: (projectId) => invoke(IPC.syncClose, projectId),
    onUpdate: (cb) => on(IPC.syncUpdateEvt, cb),
    onResync: (cb) => on(IPC.syncResyncEvt, cb),
  },
  presence: {
    update: (projectId, state) => ipcRenderer.send(IPC.presenceUpdate, projectId, state),
    onPeers: (cb) => on(IPC.presencePeersEvt, cb),
  },
  versions: {
    list: (projectId, diagramId) => invoke(IPC.verList, projectId, diagramId),
    save: (projectId, diagramId, label, content) => invoke(IPC.verSave, projectId, diagramId, label, content),
    get: (versionId) => invoke(IPC.verGet, versionId),
  },
  assets: {
    upload: (projectId, file) => invoke(IPC.assetUpload, projectId, file),
    get: (assetId) => invoke(IPC.assetGet, assetId),
    list: (projectId) => invoke(IPC.assetList, projectId),
  },
  files: {
    save: (input) => invoke(IPC.fileSave, input),
    open: (input) => invoke(IPC.fileOpen, input),
    captureScreen: () => invoke(IPC.fileCaptureScreen),
  },
};

contextBridge.exposeInMainWorld('umlab', api);
