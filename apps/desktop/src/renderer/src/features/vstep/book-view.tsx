// Trình xem sách "Ôn tổng hợp VSTEP bậc 3 (B1)": danh sách mục (thu/mở) → các trang của mục cuộn liền, vẽ + ghi chú
// lên trang; chuột phải một mục/track → ngăn kéo "Giải thích & mẹo" + trang đáp án/lời thoại của sách.
// Nghe/Nói có thêm danh sách track + trình phát nổi (thu gọn được).
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  FolderOpen,
  Lightbulb,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button, EmptyState, IconButton, Segmented, openContextMenu, type MenuEntry } from '@/ui';
import { AnnotLayer, AnnotToolbar } from './annot-layer';
import { notesUnder, useAnnots } from './annots';
import { completeLink, mmss } from './common';
import { BOOK, BOOK_KEYS, sectionOfPage, type BookSection, type BookSkill } from './content/book';
import { BOOK_PAGES, BOOK_TRACKS, KEY_PAGES, TRACK_GROUPS, bookPage, keyPage, type BookTrack } from './content/tracks';
import { ocrRegion, type Region } from './extract';
import { Drawer, SidePane, useActiveKeys } from './layout';
import { Rich } from './rich';
import { findAudio, mediaUrl, useVstep } from './store';

const ASPECT = 1.414;
const pageKey = (kind: 'book' | 'keys', n: number) => `${kind}:${n}`;

// ---------------- trang có lớp vẽ ----------------

const Page = memo(function Page({ kind, n, width }: { kind: 'book' | 'keys'; n: number; width: number }) {
  const [aspect, setAspect] = useState(ASPECT);
  const img = useRef<HTMLImageElement>(null);
  const extract = useCallback((r: Region) => ocrRegion(img.current, r), []);
  return (
    <div className="bk-page" data-page={n} style={{ width, height: Math.round(width * aspect) }}>
      <img
        ref={img}
        crossOrigin="anonymous"
        src={mediaUrl(kind === 'book' ? bookPage(n) : keyPage(n))}
        alt={`Trang ${n}`}
        loading="lazy"
        draggable={false}
        onLoad={(e) => {
          const i = e.currentTarget;
          if (i.naturalWidth) setAspect(i.naturalHeight / i.naturalWidth);
        }}
      />
      <AnnotLayer pageKey={pageKey(kind, n)} aspect={aspect} extract={extract} />
      <span className="pdf-num">{n}</span>
    </div>
  );
});

/** Chuỗi trang cuộn liền; báo trang đang xem qua onPage. */
function PageStack({
  kind,
  from,
  to,
  zoom,
  onPage,
  scrollTo,
}: {
  kind: 'book' | 'keys';
  from: number;
  to: number;
  zoom: number;
  onPage: (n: number) => void;
  scrollTo?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = Math.round(760 * zoom);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = () => {
      const mid = el.scrollTop + el.clientHeight / 3;
      let best = from;
      for (const p of el.querySelectorAll<HTMLElement>('.bk-page'))
        if (p.offsetTop <= mid) best = Number(p.dataset.page);
      onPage(best);
    };
    el.addEventListener('scroll', on, { passive: true });
    on();
    return () => el.removeEventListener('scroll', on);
  }, [from, to, onPage]);
  useEffect(() => {
    if (scrollTo == null) return;
    const el = box.current?.querySelector<HTMLElement>(`.bk-page[data-page="${scrollTo}"]`);
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - 12 });
  }, [scrollTo, from]);
  useEffect(() => box.current?.scrollTo({ top: 0 }), [from, to]);
  const pages = [];
  for (let n = from; n <= to; n++) pages.push(n);
  return (
    <div className="bk-scroll" ref={box}>
      {pages.map((n) => (
        <Page key={n} kind={kind} n={n} width={width} />
      ))}
    </div>
  );
}

/** Một trang Keys có nút lật (dùng trong ngăn kéo). */
function KeysViewer({ start, range }: { start: number; range: [number, number] }) {
  const [p, setP] = useState(start);
  const [zoom, setZoom] = useState(1);
  useEffect(() => setP(start), [start]);
  return (
    <div className="bk-keys">
      <div className="bk-keys-bar">
        <IconButton label="Trang trước" size="sm" disabled={p <= 1} onClick={() => setP(p - 1)}>
          <ChevronLeft size={15} />
        </IconButton>
        <span className="vs-time">
          Trang {p} / {KEY_PAGES}
        </span>
        <IconButton label="Trang sau" size="sm" disabled={p >= KEY_PAGES} onClick={() => setP(p + 1)}>
          <ChevronRight size={15} />
        </IconButton>
        <span className="text-muted">
          (phần này: tr. {range[0]}–{range[1]})
        </span>
        <span className="flex-1" />
        <IconButton label="Thu nhỏ" size="sm" onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}>
          <ZoomOut size={14} />
        </IconButton>
        <IconButton label="Phóng to" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
          <ZoomIn size={14} />
        </IconButton>
      </div>
      <AnnotToolbar pageKey={pageKey('keys', p)} />
      <div className="bk-keys-page" style={{ ['--kz' as string]: zoom }}>
        <Page kind="keys" n={p} width={Math.round(400 * zoom)} />
      </div>
    </div>
  );
}

function NotesList({
  prefix,
  from,
  to,
  onGo,
}: {
  prefix: 'book' | 'keys';
  from: number;
  to: number;
  onGo: (n: number) => void;
}) {
  const data = useAnnots((s) => s.data);
  const notes = notesUnder(data, prefix + ':').filter(({ key }) => {
    const n = Number(key.split(':')[1]);
    return n >= from && n <= to;
  });
  if (!notes.length) return <p className="text-muted">Chưa có ghi chú. Chọn công cụ Ghi chú rồi bấm lên trang sách.</p>;
  return (
    <div className="vs-list">
      {notes.map(({ key, note }) => (
        <button key={note.id} className="pdf-note-row" onClick={() => onGo(Number(key.split(':')[1]))}>
          <span className="an-dot" style={{ background: note.c }} />
          <span>
            <b>Trang {key.split(':')[1]}</b>
            <span className="pdf-note-t">{note.t || '(trống)'}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

type DrawerTab = 'explain' | 'keys' | 'notes';

function ExplainDrawer({
  open,
  onClose,
  tab,
  setTab,
  section,
  skill,
  keysStart,
  extra,
  onGoPage,
}: {
  open: boolean;
  onClose: () => void;
  tab: DrawerTab;
  setTab: (t: DrawerTab) => void;
  section: BookSection | undefined;
  skill: BookSkill;
  keysStart: number;
  extra?: React.ReactNode;
  onGoPage: (n: number) => void;
}) {
  return (
    <Drawer
      id={'book-' + skill}
      title={section ? section.title : 'Giải thích'}
      open={open}
      onClose={onClose}
      defaultWidth={520}
    >
      <Segmented<DrawerTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'explain', label: 'Giải thích & mẹo' },
          { value: 'keys', label: 'Đáp án / lời thoại (sách)' },
          { value: 'notes', label: 'Ghi chú' },
        ]}
      />
      <div className="mt-3">
        {tab === 'explain' && (
          <>
            {extra}
            {section ? <Rich src={section.guide} /> : <p className="text-muted">Chọn một mục.</p>}
          </>
        )}
        {tab === 'keys' && <KeysViewer start={keysStart} range={BOOK_KEYS[skill]} />}
        {tab === 'notes' && section && <NotesList prefix="book" from={section.from} to={section.to} onGo={onGoPage} />}
      </div>
    </Drawer>
  );
}

function useNoMedia() {
  const media = useVstep((s) => s.media);
  if (media?.dir && media.bookPages) return null;
  return (
    <EmptyState
      title="Chưa có thư mục sách"
      text="Chọn thư mục “Ôn tổng hợp VSTEP bậc 3 (B1)” (có sẵn trong UMLab-tool/assets/vstep) để xem trang sách và nghe track."
    >
      <Button variant="primary" icon={<FolderOpen />} onClick={() => void useVstep.getState().pickMedia()}>
        Chọn thư mục
      </Button>
    </EmptyState>
  );
}

// ---------------- sách theo mục (Đọc, Viết, Nói, lý thuyết Nghe) ----------------

export function BookView({ skill }: { skill: BookSkill }) {
  const [sp, setSp] = useSearchParams();
  const sections = BOOK[skill];
  const sec = sections.find((s) => s.id === sp.get('sec')) ?? sections[0];
  const [page, setPage] = useState(sec.from);
  const [jump, setJump] = useState<number | undefined>();
  const [zoom, setZoom] = useState(1);
  const [drawer, setDrawer] = useState<DrawerTab | null>(null);
  const learned = useVstep((s) => s.state!.learned);
  const empty = useNoMedia();
  const select = (id: string) => setSp({ tab: 'book', sec: id }, { replace: true });

  const toggleLearned = (s: BookSection) =>
    useVstep.getState().update((st) => {
      const k = 'book:' + s.id;
      if (st.learned[k]) delete st.learned[k];
      else st.learned[k] = Date.now();
    });

  const menu = (s: BookSection): MenuEntry[] => [
    { label: 'Giải thích & mẹo rút ra', icon: <Lightbulb />, onSelect: () => (select(s.id), setDrawer('explain')) },
    {
      label: 'Xem đáp án / lời thoại trong sách',
      icon: <FileQuestion />,
      onSelect: () => (select(s.id), setDrawer('keys')),
    },
    { label: 'Ghi chú của mục này', onSelect: () => (select(s.id), setDrawer('notes')) },
    { type: 'sep' },
    {
      label: learned['book:' + s.id] ? 'Bỏ đánh dấu đã học' : 'Đánh dấu đã học',
      icon: <Check />,
      onSelect: () => toggleLearned(s),
    },
  ];

  if (empty) return empty;
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <div className="bk">
      <SidePane id={'book-' + skill} title="Mục lục sách">
        {groups.map((g) => (
          <div key={g}>
            <div className="vs-toc-pt">{g}</div>
            {sections
              .filter((s) => s.group === g)
              .map((s) => (
                <button
                  key={s.id}
                  className={cn('vs-toc-item', s.id === sec.id && 'on')}
                  onClick={() => select(s.id)}
                  onContextMenu={(e) => openContextMenu(e, menu(s))}
                  title="Chuột phải: giải thích, đáp án, ghi chú"
                >
                  <span className={cn('vs-toc-ck', learned['book:' + s.id] && 'done')}>
                    {learned['book:' + s.id] && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span>
                    {s.title}
                    <span className="bk-pp">
                      tr. {s.from}
                      {s.to > s.from ? `–${s.to}` : ''}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        ))}
      </SidePane>
      <section className="bk-main">
        <div className="bk-bar">
          <b className="truncate">{sec.title}</b>
          <span className="vs-time">
            Trang {page} ({sec.from}–{sec.to})
          </span>
          <IconButton label="Thu nhỏ" size="sm" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}>
            <ZoomOut size={14} />
          </IconButton>
          <IconButton label="Phóng to" size="sm" onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}>
            <ZoomIn size={14} />
          </IconButton>
          <span className="flex-1" />
          <AnnotToolbar pageKey={pageKey('book', page)} />
          <Button size="sm" variant="outline" icon={<Lightbulb />} onClick={() => setDrawer('explain')}>
            Giải thích
          </Button>
          <Button size="sm" variant="outline" icon={<BookOpenCheck />} onClick={() => setDrawer('keys')}>
            Đáp án
          </Button>
        </div>
        <div className="bk-body">
          <PageStack
            kind="book"
            from={sec.from}
            to={Math.min(BOOK_PAGES, sec.to)}
            zoom={zoom}
            onPage={setPage}
            scrollTo={jump}
          />
          <ExplainDrawer
            open={!!drawer}
            onClose={() => setDrawer(null)}
            tab={drawer ?? 'explain'}
            setTab={setDrawer}
            section={sec}
            skill={skill}
            keysStart={sec.keys}
            onGoPage={(n) => setJump(n)}
          />
        </div>
      </section>
    </div>
  );
}

// ---------------- track sách (Nghe 01–64, Nói 65–89) ----------------

function FloatingPlayer({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [mini, setMini] = useState(false);
  const [loop, setLoop] = useState<{ a: number; b: number | null } | null>(null);
  useEffect(() => {
    setPlaying(false);
    setT(0);
    setLoop(null);
  }, [src]);
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate, src]);
  const seek = (d: number) => {
    const a = ref.current;
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d));
  };
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  useActiveKeys((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowLeft' && !e.altKey) seek(-5);
    else if (e.key === 'ArrowRight' && !e.altKey) seek(5);
  });
  const loopBtn = () => {
    const now = ref.current?.currentTime ?? 0;
    if (!loop) setLoop({ a: now, b: null });
    else if (loop.b == null) setLoop({ a: loop.a, b: Math.max(now, loop.a + 1) });
    else setLoop(null);
  };
  return (
    <div className={cn('fp', mini && 'mini')}>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setT(a.currentTime);
          if (loop?.b != null && a.currentTime >= loop.b) a.currentTime = loop.a;
        }}
        onEnded={() => setPlaying(false)}
      >
        <track kind="captions" />
      </audio>
      <button
        className="vs-play"
        onClick={toggle}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
        title="Phát / dừng (Space)"
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      {mini ? (
        <button className="fp-mini-t" onClick={() => setMini(false)} title="Mở rộng trình phát">
          {mmss(t)} / {mmss(dur)}
        </button>
      ) : (
        <>
          <span className="fp-title">{title}</span>
          <IconButton label="Lùi 5 giây (←)" size="sm" onClick={() => seek(-5)}>
            <RotateCcw size={15} />
          </IconButton>
          <IconButton label="Tới 5 giây (→)" size="sm" onClick={() => seek(5)}>
            <RotateCw size={15} />
          </IconButton>
          <span className="vs-time">{mmss(t)}</span>
          <input
            type="range"
            className="vs-seek"
            min={0}
            max={dur || 0}
            step={0.1}
            value={t}
            onChange={(e) => {
              if (ref.current) ref.current.currentTime = +e.target.value;
            }}
            aria-label="Vị trí"
          />
          <span className="vs-time">{mmss(dur)}</span>
          <select className="field fp-rate" value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Tốc độ">
            {[0.75, 0.9, 1, 1.25].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
          <IconButton
            label={!loop ? 'Lặp đoạn: đặt A' : loop.b == null ? 'Lặp đoạn: đặt B' : 'Tắt lặp đoạn'}
            size="sm"
            active={!!loop}
            onClick={loopBtn}
          >
            <Repeat size={15} />
          </IconButton>
        </>
      )}
      <IconButton label={mini ? 'Mở rộng' : 'Thu gọn trình phát'} size="sm" onClick={() => setMini((m) => !m)}>
        <ChevronDown size={15} style={{ transform: mini ? 'rotate(180deg)' : undefined }} />
      </IconButton>
    </div>
  );
}

function SelfScore({ tr }: { tr: BookTrack }) {
  const rec = useVstep((s) => s.state!.tracks[String(tr.n)]);
  const [c, setC] = useState('');
  const [t, setT] = useState('');
  useEffect(() => {
    setC(rec?.correct?.toString() ?? '');
    setT(rec?.total?.toString() ?? '');
  }, [tr.n, rec?.correct, rec?.total]);
  const save = (done: boolean) =>
    useVstep.getState().update((s) => {
      s.tracks[String(tr.n)] = {
        done,
        correct: c === '' ? null : Math.max(0, Math.round(+c)),
        total: t === '' ? null : Math.max(0, Math.round(+t)),
        at: Date.now(),
      };
      if (done) completeLink(s, `track:${tr.n}`);
    });
  return (
    <div className="vs-self">
      {tr.skill === 'listening' && (
        <>
          <span>Tự chấm</span>
          <input
            className="field"
            type="number"
            min={0}
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="đúng"
            aria-label="Số câu đúng"
          />
          <span>/</span>
          <input
            className="field"
            type="number"
            min={0}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="tổng"
            aria-label="Tổng số câu"
          />
        </>
      )}
      <Button
        size="sm"
        variant={rec?.done ? 'outline' : 'primary'}
        icon={<Check />}
        onClick={() => save(!rec?.done || c !== String(rec?.correct ?? ''))}
      >
        {rec?.done ? 'Đã luyện' : 'Đánh dấu đã luyện'}
      </Button>
    </div>
  );
}

const TRACK_TIPS: Record<string, string> = {
  'L1.1': 'Nghe 2–3 từ khoá gợi ý bối cảnh rồi mới chọn; lựa chọn lặp đúng một từ trong bài thường là bẫy.',
  'L1.2': 'Ghi nháp các mốc giờ/nơi chốn, gạch cái bị đổi; đáp án thường ở sau "but/actually".',
  'L1.3': 'So nghĩa cả câu, không so âm: walk/work, right/write, not expensive ≠ expensive.',
  'L2.1': 'Ý chính = điều cả đoạn xoay quanh, nằm ở 2–3 lượt lời đầu.',
  'L2.2': 'Mục đích nằm ở câu "I\'m calling about / I\'d like to / I was wondering if".',
  'L2.3': 'Dùng từ khoá không đổi (tên, số) để biết câu hỏi nào sắp tới.',
  'L2.4': 'Đáp án đúng nói lại bằng từ khác: put off = postpone, sold out = no tickets left.',
  'L3.1': 'Chọn lựa chọn suy ra chắc chắn từ bài, ít suy diễn nhất.',
  'L3.2': 'Xét câu trước–sau để biết người nói đưa ví dụ, nhấn mạnh hay đổi chủ đề.',
  'S1.1': 'Đọc theo băng, chú ý âm cuối -s, -ed và trọng âm; ghi âm lại để so.',
  S1: 'Nghe bài mẫu, chép khung câu, thay thông tin của bạn (Hóc Môn, IUH, Tây Ninh).',
  S2: 'Chọn 1 phương án, 2 lý do, nói vì sao không chọn 2 phương án còn lại.',
  S3: 'Mở bài nhắc lại 3 ý; mỗi ý có lý do + ví dụ; kết bằng câu tóm tắt.',
};

export function TracksView({ skill }: { skill: 'listening' | 'speaking' }) {
  const [sp, setSp] = useSearchParams();
  const media = useVstep((s) => s.media);
  const tracksDone = useVstep((s) => s.state!.tracks);
  const list = useMemo(() => BOOK_TRACKS.filter((t) => t.skill === skill), [skill]);
  const n = Number(sp.get('n')) || list[0].n;
  const tr = list.find((t) => t.n === n) ?? list[0];
  const next = BOOK_TRACKS.find((t) => t.n === tr.n + 1);
  const endPage = Math.max(
    tr.page,
    Math.min((next?.page ?? tr.page + 1) - (next && next.page > tr.page ? 1 : 0), tr.page + 3),
  );
  const [page, setPage] = useState(tr.page);
  const [zoom, setZoom] = useState(1);
  const [drawer, setDrawer] = useState<DrawerTab | null>(null);
  const [keysStart, setKeysStart] = useState(tr.script);
  const empty = useNoMedia();
  const section = sectionOfPage(skill, tr.page);
  useEffect(() => setKeysStart(tr.script), [tr]);
  const select = (x: number) => setSp({ tab: 'tracks', n: String(x) }, { replace: true });
  const audio = findAudio(media, tr.file);

  const menu = (t: BookTrack): MenuEntry[] => [
    { label: 'Giải thích đáp án & mẹo', icon: <Lightbulb />, onSelect: () => (select(t.n), setDrawer('explain')) },
    {
      label: 'Xem lời thoại trong sách',
      icon: <FileQuestion />,
      onSelect: () => (select(t.n), setKeysStart(t.script), setDrawer('keys')),
    },
    ...(t.answer
      ? [
          {
            label: 'Xem trang đáp án',
            icon: <BookOpenCheck />,
            onSelect: () => (select(t.n), setKeysStart(t.answer!), setDrawer('keys')),
          } as MenuEntry,
        ]
      : []),
    { label: 'Ghi chú của track này', onSelect: () => (select(t.n), setDrawer('notes')) },
  ];

  if (empty) return empty;

  return (
    <div className="bk">
      <SidePane id={'tracks-' + skill} title={skill === 'listening' ? 'Track 01–64' : 'Track 65–89'}>
        {TRACK_GROUPS.filter((g) => g.skill === skill).map((g) => (
          <div key={g.code}>
            <div className="vs-toc-pt">
              {g.code} - {g.title}
            </div>
            {list
              .filter((t) => t.group === g.code)
              .map((t) => {
                const r = tracksDone[String(t.n)];
                return (
                  <button
                    key={t.n}
                    className={cn('vs-track', t.n === tr.n && 'on', r?.done && 'done')}
                    onClick={() => select(t.n)}
                    onContextMenu={(e) => openContextMenu(e, menu(t))}
                    title="Chuột phải: giải thích, lời thoại, đáp án"
                  >
                    <span className="vs-track-n">{String(t.n).padStart(2, '0')}</span>
                    <span className="vs-track-l">
                      {t.label}, tr. {t.page}
                    </span>
                    {r?.done && (
                      <span className="vs-track-s">{r.total ? `${r.correct}/${r.total}` : <Check size={12} />}</span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </SidePane>
      <section className="bk-main">
        <div className="bk-bar">
          <b className="truncate">
            Track {String(tr.n).padStart(2, '0')} - {tr.label}
          </b>
          <span className="vs-time">Trang {page}</span>
          <IconButton label="Thu nhỏ" size="sm" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}>
            <ZoomOut size={14} />
          </IconButton>
          <IconButton label="Phóng to" size="sm" onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}>
            <ZoomIn size={14} />
          </IconButton>
          <span className="flex-1" />
          <AnnotToolbar pageKey={pageKey('book', page)} />
          <SelfScore tr={tr} />
          <Button size="sm" variant="outline" icon={<Lightbulb />} onClick={() => setDrawer('explain')}>
            Giải thích
          </Button>
        </div>
        <div className="bk-body">
          <PageStack kind="book" from={tr.page} to={endPage} zoom={zoom} onPage={setPage} />
          <ExplainDrawer
            open={!!drawer}
            onClose={() => setDrawer(null)}
            tab={drawer ?? 'explain'}
            setTab={setDrawer}
            section={section}
            skill={skill}
            keysStart={keysStart}
            onGoPage={() => {}}
            extra={
              <div className="vt-callout" data-kind="note">
                <div className="vt-block-title">
                  Track {String(tr.n).padStart(2, '0')} ({tr.groupTitle})
                </div>
                <p className="mt-1">{TRACK_TIPS[tr.group]}</p>
                <p className="mt-1 text-muted">
                  Trang lời thoại gợi ý: {tr.script}
                  {tr.answer ? `, trang đáp án: ${tr.answer}` : ''} (tab “Đáp án / lời thoại”, lật trang nếu lệch).
                </p>
              </div>
            }
          />
          {audio ? (
            <FloatingPlayer key={audio} src={mediaUrl(audio)} title={`Track ${String(tr.n).padStart(2, '0')}`} />
          ) : (
            <div className="fp">
              <Volume2 size={15} />
              <span className="text-warn">Không thấy tệp {tr.file}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
