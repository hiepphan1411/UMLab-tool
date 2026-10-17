import { AlertTriangle, ArrowLeft, Braces, CloudOff, FileUp, ImageDown, Loader2, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DIAGRAM_TYPE_BY_ID, diagramsMap, renameDiagram } from '@umlab/core';
import { hhmm } from '@/lib/format';
import { DiagramIcon } from '@/lib/icons';
import { useConn } from '@/lib/conn';
import { Button, EmptyState, FullScreenSpinner, IconButton, useTooltip } from '@/ui';
import { useSession } from '../auth/session';
import { ConnectionBadge } from '../shell/connection-badge';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { EditorContext, getEditor, type EditorActions, type EditorProps } from '../editors/editor-registry';
import { PresenceAvatars } from './presence';
import { ProjectError } from './workspace-page';
import { LOCAL, useProjectSession, useSessionState, useYVersion, type ProjectSession } from './session';
import { pushRecent } from './ui-state';
import { useUndo } from './use-undo';
import '../editors/register-all';

export function EditorPage() {
  const { projectId, diagramId } = useParams();
  const { session, error, code } = useProjectSession(projectId);
  if (error) return <ProjectError error={error} code={code} />;
  if (!session || !diagramId) return <FullScreenSpinner label="Đang mở sơ đồ…" />;
  return <DiagramEditor key={diagramId} session={session} diagramId={diagramId} />;
}

/** Chip trạng thái lưu: "Đã lưu · 10:32" / "Đang lưu…" / "Ngoại tuyến — sẽ gửi khi có mạng". */
function SaveChip({ session }: { session: ProjectSession }) {
  const { save, lastSavedAt, error } = useSessionState(session);
  const conn = useConn((x) => x.status);
  let text: string;
  let icon = null;
  let color = 'var(--muted)';
  if (save === 'error') {
    text = 'Lỗi lưu';
    icon = <AlertTriangle size={13} />;
    color = 'var(--danger)';
  } else if (conn.state !== 'online' && (conn.pending > 0 || save !== 'saved')) {
    text = 'Ngoại tuyến · chờ gửi';
    icon = <CloudOff size={13} />;
  } else if (save === 'saving' || save === 'pending') {
    text = 'Đang lưu…';
    icon = <Loader2 size={13} className="spin" />;
  } else text = lastSavedAt ? `Đã lưu · ${hhmm(lastSavedAt)}` : 'Đã lưu';
  const tip = useTooltip(save === 'error' ? error : 'Mọi thay đổi được lưu và đồng bộ tự động');
  return (
    <span
      className="no-drag flex flex-none items-center gap-1 text-[12px]"
      style={{ color }}
      data-save-state={save}
      {...tip}
    >
      {icon}
      {text}
    </span>
  );
}

function NameInput({
  session,
  id,
  name,
  readOnly,
}: {
  session: ProjectSession;
  id: string;
  name: string;
  readOnly: boolean;
}) {
  const [v, setV] = useState(name);
  useEffect(() => setV(name), [name]);
  const commit = () => {
    if (v.trim() && v !== name) renameDiagram(session.doc, id, v, LOCAL);
    else setV(name);
  };
  return (
    <input
      id="diagram-title"
      className="field"
      style={{
        width: Math.min(360, Math.max(140, v.length * 8 + 30)),
        flex: 'none',
        background: 'transparent',
        borderColor: 'transparent',
        fontWeight: 600,
        fontSize: 13.5,
      }}
      value={v}
      readOnly={readOnly}
      aria-label="Tên sơ đồ"
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setV(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function Placeholder({ diagram }: EditorProps) {
  return (
    <div className="grid h-full" style={{ gridTemplateColumns: '264px 1fr 280px' }}>
      <aside className="border-r border-line bg-panel p-3 text-muted">Palette</aside>
      <div className="grid place-items-center" style={{ background: 'var(--canvas)' }}>
        <EmptyState
          title={DIAGRAM_TYPE_BY_ID[diagram.type]?.label ?? diagram.type}
          text="Editor cho loại sơ đồ này sẽ có ở phase sau."
        />
      </div>
      <aside className="border-l border-line bg-panel p-3 text-muted">Inspector</aside>
    </div>
  );
}

function DiagramEditor({ session: s, diagramId }: { session: ProjectSession; diagramId: string }) {
  const nav = useNavigate();
  const user = useSession((x) => x.user);
  const { project, peers } = useSessionState(s);
  const metaVersion = useYVersion(s.doc, ['diagrams']);
  const diagram = useMemo(() => diagramsMap(s.doc).get(diagramId), [s, diagramId, metaVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const undo = useUndo(s, diagramId);
  const [actions, setActions] = useState<EditorActions>({});
  const readOnly = !s.canEdit;

  useEffect(() => {
    if (user) pushRecent(user.id, s.projectId, diagramId);
    s.setPresence({ diagramId, cursor: null, selection: [] });
    return () => s.setPresence({ diagramId: null, cursor: null, selection: [] });
  }, [s, diagramId, user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) undo.redo();
        else undo.undo();
      } else if (mod && k === 'y') {
        e.preventDefault();
        undo.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  if (!diagram)
    return (
      <div className="flex h-full flex-col">
        <TopBar>
          <IconButton label="Về project" onClick={() => nav(`/p/${s.projectId}`)}>
            <ArrowLeft />
          </IconButton>
          <Spacer />
          <ThemeButton />
        </TopBar>
        <EmptyState title="Sơ đồ không còn tồn tại" text="Sơ đồ này vừa bị xoá (có thể bởi một thành viên khác).">
          <Link to={`/p/${s.projectId}`} className="btn primary">
            Về project
          </Link>
        </EmptyState>
      </div>
    );

  const Editor = getEditor(diagram.type) ?? Placeholder;
  const props: EditorProps = { session: s, diagram, undo, readOnly, setActions };
  return (
    <EditorContext.Provider value={props}>
      <div className="flex h-full flex-col">
        <TopBar>
          <IconButton label={`Về ${project.name}`} onClick={() => nav(`/p/${s.projectId}`)}>
            <ArrowLeft />
          </IconButton>
          <DiagramIcon type={diagram.type} colored />
          <NameInput session={s} id={diagram.id} name={diagram.name} readOnly={readOnly} />
          <SaveChip session={s} />
          {readOnly && (
            <span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
              Chỉ xem
            </span>
          )}
          <span className="sep" />
          <IconButton label="Hoàn tác" shortcut="Ctrl+Z" disabled={!undo.canUndo || readOnly} onClick={undo.undo}>
            <Undo2 />
          </IconButton>
          <IconButton label="Làm lại" shortcut="Ctrl+Shift+Z" disabled={!undo.canRedo || readOnly} onClick={undo.redo}>
            <Redo2 />
          </IconButton>
          {actions.extra}
          <Spacer />
          <PresenceAvatars session={s} peers={peers} diagramId={diagram.id} />
          <IconButton label="Kiểm tra mô hình" disabled={!actions.check} onClick={actions.check}>
            <span className="relative">
              <AlertTriangle />
              {!!actions.issues && (
                <span
                  className="absolute -top-1.5 -right-2 rounded-full px-1 text-[9px] leading-[14px] font-bold text-white"
                  style={{ background: 'var(--warn)' }}
                >
                  {actions.issues}
                </span>
              )}
            </span>
          </IconButton>
          <span className="sep" />
          {!readOnly && (
            <Button variant="outline" icon={<FileUp />} disabled={!actions.importJson} onClick={actions.importJson}>
              Nhập JSON
            </Button>
          )}
          <Button variant="outline" icon={<Braces />} disabled={!actions.exportJson} onClick={actions.exportJson}>
            Xuất JSON
          </Button>
          <Button variant="primary" icon={<ImageDown />} disabled={!actions.exportImage} onClick={actions.exportImage}>
            Xuất ảnh
          </Button>
          <span className="sep" />
          <ConnectionBadge compact />
          <ThemeButton />
        </TopBar>
        <div className="min-h-0 flex-1">
          <Editor {...props} />
        </div>
      </div>
    </EditorContext.Provider>
  );
}
