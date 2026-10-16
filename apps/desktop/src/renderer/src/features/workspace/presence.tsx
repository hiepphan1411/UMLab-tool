import type { Peer } from '@shared/api';
import { Avatar } from '@/ui';
import { diagramsMap } from '@umlab/core';
import type { ProjectSession } from './session';

/** Gộp các phiên của cùng một người (mở 2 cửa sổ) thành một avatar. */
export function uniquePeers(peers: Peer[]): Peer[] {
  const m = new Map<string, Peer>();
  for (const p of peers) {
    const cur = m.get(p.userId);
    if (!cur || p.updatedAt > cur.updatedAt) m.set(p.userId, p);
  }
  return [...m.values()];
}

/** Avatar những người đang mở project (hoặc đang mở cùng sơ đồ khi truyền diagramId). */
export function PresenceAvatars({
  session,
  peers,
  diagramId,
}: {
  session: ProjectSession;
  peers: Peer[];
  diagramId?: string;
}) {
  const list = uniquePeers(diagramId ? peers.filter((p) => p.diagramId === diagramId) : peers);
  if (!list.length) return null;
  return (
    <div className="no-drag flex items-center" aria-label={`${list.length} người đang online`}>
      {list.slice(0, 5).map((p, i) => {
        const where = p.diagramId ? diagramsMap(session.doc).get(p.diagramId)?.name : null;
        return (
          <span key={p.userId} style={{ marginLeft: i ? -6 : 0 }}>
            <Avatar
              name={p.name}
              color={p.color}
              size={26}
              ring="var(--panel)"
              title={`${p.name} — ${where ? 'đang xem ' + where : 'đang ở dashboard'}`}
            />
          </span>
        );
      })}
      {list.length > 5 && <span className="ml-1 text-muted">+{list.length - 5}</span>}
    </div>
  );
}
