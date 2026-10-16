import { IPC, type Peer, type PresenceState } from '@shared/api';
import { auth } from './auth.service';
import { CLIENT_ID } from './client-id';
import { database, type PresenceDoc } from './db';
import { broadcast } from './events';
import { ChangeFeed } from './feed';

const WRITE_MS = 120;
const HEARTBEAT_MS = 10_000;
const STALE_MS = 30_000;

interface Room {
  feed: ChangeFeed<PresenceDoc>;
  peers: Map<string, Peer>;
  state: PresenceState;
  dirty: boolean;
  writing: boolean;
  timer: NodeJS.Timeout | null;
  lastSig: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toPeer(d: PresenceDoc): Peer {
  return {
    clientId: d.clientId,
    userId: d.userId,
    name: d.name,
    color: d.color,
    diagramId: d.diagramId,
    cursor: d.cursor,
    selection: d.selection ?? [],
    dragging: d.dragging ?? null,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.getTime() : Date.now(),
  };
}

/** Ai đang mở project nào/sơ đồ nào, con trỏ và vùng chọn của họ. Lưu ở collection presence (TTL 60 giây). */
class PresenceService {
  private rooms = new Map<string, Room>();
  private heartbeat: NodeJS.Timeout | null = null;

  init(): void {
    this.heartbeat = setInterval(() => {
      for (const [pid, room] of this.rooms) {
        room.dirty = true;
        void this.write(pid);
        this.prune(pid);
      }
    }, HEARTBEAT_MS);
    setInterval(() => {
      for (const pid of this.rooms.keys()) this.prune(pid);
    }, 5000);
  }

  join(projectId: string): void {
    if (this.rooms.has(projectId)) return;
    const room: Room = {
      feed: this.makeFeed(projectId),
      peers: new Map(),
      state: { diagramId: null, cursor: null, selection: [], dragging: null },
      dirty: true,
      writing: false,
      timer: null,
      lastSig: '',
    };
    this.rooms.set(projectId, room);
    void room.feed.start().then(() => this.reload(projectId));
    void this.write(projectId);
  }

  leave(projectId: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    room.feed.stop();
    if (room.timer) clearTimeout(room.timer);
    this.rooms.delete(projectId);
    if (database.ready)
      void database
        .presence()
        .deleteOne({ _id: `${projectId}:${CLIENT_ID}` })
        .catch(() => {});
  }

  async leaveAll(): Promise<void> {
    const ids = [...this.rooms.keys()];
    for (const id of ids) this.leave(id);
    if (database.ready)
      await database
        .presence()
        .deleteMany({ clientId: CLIENT_ID })
        .catch(() => {});
  }

  update(projectId: string, state: PresenceState): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    room.state = {
      diagramId: typeof state.diagramId === 'string' ? state.diagramId : null,
      cursor:
        state.cursor && Number.isFinite(state.cursor.x) && Number.isFinite(state.cursor.y)
          ? { x: Math.round(state.cursor.x), y: Math.round(state.cursor.y) }
          : null,
      selection: Array.isArray(state.selection) ? state.selection.slice(0, 200).map(String) : [],
      dragging:
        state.dragging && Array.isArray(state.dragging.ids)
          ? {
              ids: state.dragging.ids.slice(0, 200).map(String),
              dx: Number(state.dragging.dx) || 0,
              dy: Number(state.dragging.dy) || 0,
            }
          : null,
    };
    room.dirty = true;
    if (!room.timer) room.timer = setTimeout(() => void this.write(projectId), WRITE_MS);
  }

  private async write(projectId: string): Promise<void> {
    const room = this.rooms.get(projectId);
    if (!room) return;
    room.timer = null;
    if (!room.dirty || room.writing || !database.ready) return;
    const user = await auth.require().catch(() => null);
    if (!user) return;
    room.dirty = false;
    room.writing = true;
    try {
      await database.presence().replaceOne(
        { _id: `${projectId}:${CLIENT_ID}` },
        {
          projectId,
          clientId: CLIENT_ID,
          userId: user._id,
          name: user.name,
          color: user.color,
          diagramId: room.state.diagramId,
          cursor: room.state.cursor,
          selection: room.state.selection,
          dragging: room.state.dragging ?? null,
          updatedAt: new Date(),
        },
        { upsert: true },
      );
    } catch (e) {
      room.dirty = true;
      console.warn('[presence] write', (e as Error).message);
    } finally {
      room.writing = false;
      if (room.dirty && !room.timer) room.timer = setTimeout(() => void this.write(projectId), WRITE_MS);
    }
  }

  private emit(projectId: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    const peers = [...room.peers.values()].filter((p) => p.clientId !== CLIENT_ID);
    const sig = JSON.stringify(
      peers.map((p) => [p.clientId, p.diagramId, p.cursor, p.selection, p.dragging, p.name, p.color]),
    );
    if (sig === room.lastSig) return;
    room.lastSig = sig;
    broadcast(IPC.presencePeersEvt, projectId, peers);
  }

  private prune(projectId: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    const now = Date.now();
    let changed = false;
    for (const [k, p] of room.peers) {
      if (now - p.updatedAt > STALE_MS) {
        room.peers.delete(k);
        changed = true;
      }
    }
    if (changed) this.emit(projectId);
  }

  private async reload(projectId: string): Promise<void> {
    const room = this.rooms.get(projectId);
    if (!room || !database.ready) return;
    const docs = await database.presence().find({ projectId }).toArray();
    room.peers = new Map(docs.map((d) => [d.clientId, toPeer(d)]));
    this.emit(projectId);
  }

  private makeFeed(projectId: string): ChangeFeed<PresenceDoc> {
    return new ChangeFeed<PresenceDoc>({
      name: 'presence:' + projectId,
      collection: () => database.presence(),
      pipeline: [
        {
          $match: {
            $or: [
              { 'fullDocument.projectId': projectId },
              { 'documentKey._id': { $regex: '^' + esc(projectId) + ':' } },
            ],
          },
        },
      ],
      fullDocument: true,
      onChange: (ev) => {
        const room = this.rooms.get(projectId);
        if (!room) return;
        if (ev.operationType === 'delete') {
          const key = String(ev.documentKey._id).split(':')[1];
          if (key) room.peers.delete(key);
        } else if ('fullDocument' in ev && ev.fullDocument) {
          const d = ev.fullDocument as PresenceDoc;
          room.peers.set(d.clientId, toPeer(d));
        }
        this.emit(projectId);
      },
      poll: () => this.reload(projectId),
      pollMs: 1500,
      onReconnect: () => this.reload(projectId),
    });
  }
}

export const presence = new PresenceService();
