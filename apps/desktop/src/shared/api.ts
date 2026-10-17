// Hợp đồng IPC giữa main process (truy cập MongoDB) và renderer (React).
// Renderer không bao giờ cầm chuỗi kết nối hay truy vấn DB trực tiếp — chỉ gọi các hàm dưới đây qua window.umlab.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: ErrorCode };

export type ErrorCode =
  'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'RATE_LIMITED' | 'OFFLINE' | 'INTERNAL';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  color: string;
  createdAt: string;
}

export type Role = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  userId: string;
  role: Role;
  name: string;
  email: string;
  color: string;
}

export interface ProjectStats {
  diagramCount: number;
  diagramCountByType: Record<string, number>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  ownerId: string;
  role: Role;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
  /** Bản lưu trên máy này (local-first): tệp .umlab; pendingCreate = tạo khi mất mạng, chưa có trên MongoDB. */
  local?: { file: string; pendingCreate?: boolean } | null;
}

export interface ProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

/** Tạo project: thư mục lưu trên máy (bắt buộc ở hộp thoại tạo; trống = thư mục mặc định Documents/UMLab). */
export interface ProjectCreateInput extends ProjectInput {
  initialUpdate?: Uint8Array;
  localDir?: string;
}

export type ConnState = 'connecting' | 'online' | 'offline' | 'unconfigured';

export interface ConnStatus {
  state: ConnState;
  /** Change stream khả dụng (Atlas/replica set). false → đang dùng chế độ hỏi vòng. */
  realtime: boolean;
  dbName: string;
  host: string;
  error?: string;
  /** Số bản cập nhật đang chờ gửi lên DB (khi mất mạng). */
  pending: number;
  /** Độ trễ heartbeat gần nhất tới MongoDB (ms) — để báo kết nối yếu. */
  latencyMs?: number;
}

/** Chất lượng kết nối hiển thị bằng icon wifi: tốt (xanh) / yếu hoặc đang đồng bộ (vàng) / mất (đỏ). */
export type ConnQuality = 'good' | 'weak' | 'down';
export const WEAK_LATENCY_MS = 600;
export function connQuality(s: ConnStatus): ConnQuality {
  if (s.state === 'offline' || s.state === 'unconfigured') return 'down';
  if (s.state === 'connecting' || s.pending > 0 || (s.latencyMs ?? 0) >= WEAK_LATENCY_MS) return 'weak';
  return 'good';
}

export interface AppInfo {
  version: string;
  platform: string;
  electron: string;
  userDataDir: string;
  isDev: boolean;
}

export interface PresenceState {
  diagramId: string | null;
  cursor: { x: number; y: number } | null;
  selection: string[];
  /** Vị trí tạm khi người khác đang kéo hình (để thấy hình di chuyển trước khi thả). */
  dragging?: { ids: string[]; dx: number; dy: number } | null;
}

export interface Peer extends PresenceState {
  clientId: string;
  userId: string;
  name: string;
  color: string;
  updatedAt: number;
}

export interface OpenedProject {
  project: ProjectSummary;
  /** Các bản cập nhật Yjs (snapshot + update) của project, áp dụng theo thứ tự bất kỳ. */
  updates: Uint8Array[];
  clientId: string;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenedFile {
  name: string;
  path: string;
  /** Nội dung dạng chữ (UTF-8) khi asText, ngược lại là bytes. */
  text?: string;
  bytes?: Uint8Array;
}

export interface DiagramVersionInfo {
  id: string;
  diagramId: string;
  createdAt: string;
  userId: string;
  userName: string;
  label: string;
  size: number;
}

export interface AssetInfo {
  id: string;
  projectId: string;
  mime: string;
  size: number;
  name: string;
  createdAt: string;
}

export type Unsubscribe = () => void;

export interface UmlabApi {
  app: {
    info(): Promise<AppInfo>;
    setTitleBarTheme(theme: { color: string; symbolColor: string }): void;
    openExternal(url: string): Promise<void>;
    reload(): void;
  };
  conn: {
    status(): Promise<ConnStatus>;
    onStatus(cb: (s: ConnStatus) => void): Unsubscribe;
    /** Kết nối lại ngay (chuỗi kết nối cố định trong bản build, không sửa được từ app). */
    retry(): Promise<ConnStatus>;
  };
  local: {
    /** Thư mục mặc định: Documents/UMLab. */
    defaultDir(): Promise<string>;
    pickFolder(initial?: string): Promise<string | null>;
    /** Mở thư mục chứa tệp .umlab của project trong Explorer. */
    reveal(projectId: string): Promise<void>;
    /** Chuyển tệp .umlab của project sang thư mục khác. */
    move(projectId: string, dir: string): Promise<Result<ProjectSummary>>;
  };
  auth: {
    session(): Promise<PublicUser | null>;
    register(input: { name: string; email: string; password: string }): Promise<Result<PublicUser>>;
    login(input: { email: string; password: string; remember: boolean }): Promise<Result<PublicUser>>;
    logout(): Promise<void>;
    logoutAll(): Promise<Result<void>>;
    updateProfile(input: { name: string; color?: string }): Promise<Result<PublicUser>>;
    changePassword(input: { currentPassword: string; newPassword: string }): Promise<Result<void>>;
    onSessionEnded(cb: (reason: string) => void): Unsubscribe;
  };
  projects: {
    list(): Promise<Result<ProjectSummary[]>>;
    get(id: string): Promise<Result<ProjectSummary>>;
    create(input: ProjectCreateInput): Promise<Result<ProjectSummary>>;
    update(id: string, patch: ProjectInput): Promise<Result<ProjectSummary>>;
    remove(id: string): Promise<Result<void>>;
    setStats(id: string, stats: ProjectStats): Promise<void>;
    addMember(id: string, email: string, role: Role): Promise<Result<ProjectSummary>>;
    setMemberRole(id: string, userId: string, role: Role): Promise<Result<ProjectSummary>>;
    removeMember(id: string, userId: string): Promise<Result<ProjectSummary>>;
    /** Tải toàn bộ cập nhật của project (không mở realtime) — dùng cho nhân bản/xuất JSON. */
    loadUpdates(id: string): Promise<Result<Uint8Array[]>>;
    onChanged(cb: () => void): Unsubscribe;
  };
  sync: {
    open(projectId: string): Promise<Result<OpenedProject>>;
    push(projectId: string, update: Uint8Array): Promise<Result<void>>;
    close(projectId: string): Promise<void>;
    onUpdate(cb: (projectId: string, update: Uint8Array) => void): Unsubscribe;
    /** Bắn khi project vừa được nạp lại toàn bộ (sau khi mất kết nối) — renderer áp dụng lại cho chắc. */
    onResync(cb: (projectId: string, updates: Uint8Array[]) => void): Unsubscribe;
  };
  presence: {
    update(projectId: string, state: PresenceState): void;
    onPeers(cb: (projectId: string, peers: Peer[]) => void): Unsubscribe;
  };
  versions: {
    list(projectId: string, diagramId: string): Promise<Result<DiagramVersionInfo[]>>;
    save(projectId: string, diagramId: string, label: string, content: string): Promise<Result<DiagramVersionInfo>>;
    get(versionId: string): Promise<Result<string>>;
  };
  assets: {
    upload(projectId: string, file: { name: string; mime: string; bytes: Uint8Array }): Promise<Result<AssetInfo>>;
    get(assetId: string): Promise<Result<{ mime: string; bytes: Uint8Array }>>;
    list(projectId: string): Promise<Result<AssetInfo[]>>;
  };
  files: {
    save(input: { defaultName: string; filters?: FileFilter[]; data: string | Uint8Array }): Promise<string | null>;
    open(input: { filters?: FileFilter[]; multiple?: boolean; asText?: boolean }): Promise<OpenedFile[]>;
    /** Chụp toàn màn hình chính (ẩn cửa sổ UMLab trong lúc chụp) → data URL PNG, null nếu không chụp được. */
    captureScreen(): Promise<string | null>;
  };
}

/** Tên kênh IPC (invoke). */
export const IPC = {
  appInfo: 'app:info',
  appTitleBar: 'app:titlebar',
  appOpenExternal: 'app:openExternal',
  appReload: 'app:reload',
  connStatus: 'conn:status',
  connStatusEvt: 'conn:status:evt',
  connRetry: 'conn:retry',
  localDefaultDir: 'local:defaultDir',
  localPickFolder: 'local:pickFolder',
  localReveal: 'local:reveal',
  localMove: 'local:move',
  authSession: 'auth:session',
  authRegister: 'auth:register',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authLogoutAll: 'auth:logoutAll',
  authUpdateProfile: 'auth:updateProfile',
  authChangePassword: 'auth:changePassword',
  authEndedEvt: 'auth:ended:evt',
  projList: 'proj:list',
  projGet: 'proj:get',
  projCreate: 'proj:create',
  projUpdate: 'proj:update',
  projRemove: 'proj:remove',
  projSetStats: 'proj:setStats',
  projAddMember: 'proj:addMember',
  projSetMemberRole: 'proj:setMemberRole',
  projRemoveMember: 'proj:removeMember',
  projLoadUpdates: 'proj:loadUpdates',
  projChangedEvt: 'proj:changed:evt',
  syncOpen: 'sync:open',
  syncPush: 'sync:push',
  syncClose: 'sync:close',
  syncUpdateEvt: 'sync:update:evt',
  syncResyncEvt: 'sync:resync:evt',
  presenceUpdate: 'presence:update',
  presencePeersEvt: 'presence:peers:evt',
  verList: 'ver:list',
  verSave: 'ver:save',
  verGet: 'ver:get',
  assetUpload: 'asset:upload',
  assetGet: 'asset:get',
  assetList: 'asset:list',
  fileSave: 'file:save',
  fileOpen: 'file:open',
  fileCaptureScreen: 'file:captureScreen',
} as const;
