import {
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button, EmptyState, IconButton, Segmented } from '@/ui';
import { completeLink, mmss } from './common';
import { BOOK_PAGES, BOOK_TRACKS, KEY_PAGES, TRACK_GROUPS, bookPage, keyPage, type BookTrack } from './content/tracks';
import { findAudio, mediaUrl, useVstep } from './store';

function Player({ src, onEnded }: { src: string; onEnded?: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'ArrowLeft') seek(-5);
      if (e.key === 'ArrowRight') seek(5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const loopBtn = () => {
    const now = ref.current?.currentTime ?? 0;
    if (!loop) setLoop({ a: now, b: null });
    else if (loop.b == null) setLoop({ a: loop.a, b: Math.max(now, loop.a + 1) });
    else setLoop(null);
  };
  return (
    <div className="vs-player">
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
        onEnded={() => (setPlaying(false), onEnded?.())}
      >
        <track kind="captions" />
      </audio>
      <IconButton label="Lùi 5 giây (←)" onClick={() => seek(-5)}>
        <RotateCcw size={16} />
      </IconButton>
      <button
        className="vs-play"
        onClick={toggle}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
        title="Phát / dừng (Space)"
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <IconButton label="Tới 5 giây (→)" onClick={() => seek(5)}>
        <RotateCw size={16} />
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
      <Segmented<number>
        value={rate}
        onChange={setRate}
        options={[0.75, 0.9, 1, 1.25].map((r) => ({ value: r, label: `${r}×` }))}
      />
      <IconButton
        label={!loop ? 'Lặp đoạn: đặt điểm A' : loop.b == null ? 'Lặp đoạn: đặt điểm B' : 'Tắt lặp đoạn'}
        active={!!loop}
        onClick={loopBtn}
      >
        <Repeat size={16} />
      </IconButton>
      {loop && (
        <span className="vs-time">{loop.b == null ? `A ${mmss(loop.a)}…` : `${mmss(loop.a)}–${mmss(loop.b)}`}</span>
      )}
    </div>
  );
}

function PageViewer({ kind, page, onPage }: { kind: 'book' | 'keys'; page: number; onPage: (p: number) => void }) {
  const [zoom, setZoom] = useState(1);
  const max = kind === 'book' ? BOOK_PAGES : KEY_PAGES;
  const src = mediaUrl(kind === 'book' ? bookPage(page) : keyPage(page));
  return (
    <div className="vs-pages">
      <div className="vs-pages-bar">
        <IconButton label="Trang trước" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={15} />
        </IconButton>
        <span>
          Trang{' '}
          <input
            className="field vs-page-in"
            type="number"
            min={1}
            max={max}
            value={page}
            onChange={(e) => onPage(Math.min(max, Math.max(1, +e.target.value || 1)))}
          />{' '}
          / {max}
        </span>
        <IconButton label="Trang sau" size="sm" disabled={page >= max} onClick={() => onPage(page + 1)}>
          <ChevronRight size={15} />
        </IconButton>
        <span className="flex-1" />
        <IconButton label="Thu nhỏ" size="sm" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}>
          <ZoomOut size={15} />
        </IconButton>
        <IconButton label="Phóng to" size="sm" onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))}>
          <ZoomIn size={15} />
        </IconButton>
      </div>
      <div className="vs-pages-scroll">
        <img src={src} alt={`Trang ${page}`} style={{ width: `${zoom * 100}%` }} draggable={false} />
      </div>
    </div>
  );
}

function SelfScore({ tr }: { tr: BookTrack }) {
  const rec = useVstep((s) => s.state!.tracks[String(tr.n)]);
  const [c, setC] = useState(rec?.correct?.toString() ?? '');
  const [t, setT] = useState(rec?.total?.toString() ?? '');
  useEffect(() => {
    setC(rec?.correct?.toString() ?? '');
    setT(rec?.total?.toString() ?? '');
  }, [tr.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (done: boolean) =>
    useVstep.getState().update((s) => {
      const correct = c === '' ? null : Math.max(0, Math.round(+c));
      const total = t === '' ? null : Math.max(0, Math.round(+t));
      s.tracks[String(tr.n)] = { done, correct, total, at: Date.now() };
      if (done) completeLink(s, `track:${tr.n}`);
    });
  return (
    <div className="vs-self">
      {tr.skill === 'listening' && (
        <>
          <span>Tự chấm:</span>
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

export function TracksView({ skill }: { skill: 'listening' | 'speaking' }) {
  const [sp, setSp] = useSearchParams();
  const media = useVstep((s) => s.media);
  const tracksDone = useVstep((s) => s.state!.tracks);
  const list = useMemo(() => BOOK_TRACKS.filter((t) => t.skill === skill), [skill]);
  const n = Number(sp.get('n')) || list[0].n;
  const tr = list.find((t) => t.n === n) ?? list[0];
  const [view, setView] = useState<'book' | 'keys'>('book');
  const [bookP, setBookP] = useState(tr.page);
  const [keyP, setKeyP] = useState(tr.answer ?? tr.script);
  useEffect(() => {
    setBookP(tr.page);
    setKeyP(tr.script);
    setView('book');
  }, [tr]);
  const audio = findAudio(media, tr.file);
  const select = (x: number) => setSp({ tab: 'tracks', n: String(x) }, { replace: true });

  if (!media?.dir || !media.audio.length)
    return (
      <EmptyState
        title="Chưa có thư mục tài liệu"
        text="Chọn thư mục “Ôn tổng hợp VSTEP bậc 3 (B1)” (chứa thư mục MP3) để nghe và xem trang sách."
      >
        <Button variant="primary" icon={<FolderOpen />} onClick={() => void useVstep.getState().pickMedia()}>
          Chọn thư mục
        </Button>
      </EmptyState>
    );

  return (
    <div className="vs-tracks">
      <aside className="vs-track-list">
        {TRACK_GROUPS.filter((g) => g.skill === skill).map((g) => (
          <div key={g.code}>
            <div className="vs-toc-pt">
              {g.code} — {g.title}
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
      </aside>
      <section className="vs-track-main">
        <div className="vs-track-head">
          <div>
            <h2>
              Track {String(tr.n).padStart(2, '0')} — {tr.label}
            </h2>
            <div className="text-muted">
              {tr.groupTitle}. Trang sách {tr.page}.
            </div>
          </div>
          <SelfScore tr={tr} />
        </div>
        {audio ? (
          <Player src={mediaUrl(audio)} />
        ) : (
          <p className="text-warn">Không thấy tệp {tr.file} trong thư mục đã chọn.</p>
        )}
        <div className="vs-track-tabs">
          <Segmented<'book' | 'keys'>
            value={view}
            onChange={setView}
            options={[
              { value: 'book', label: 'Trang sách (câu hỏi)' },
              { value: 'keys', label: 'Lời thoại / đáp án' },
            ]}
          />
          {view === 'keys' && tr.answer && (
            <span className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setKeyP(tr.answer!)}>
                Tới trang đáp án
              </Button>
              <Button size="sm" variant="outline" onClick={() => setKeyP(tr.script)}>
                Tới trang lời thoại
              </Button>
            </span>
          )}
          <span className="vs-muted-line">
            Space: phát/dừng, ←/→: tua 5 giây. Nghe 1 lần như thi thật trước khi xem lời thoại.
          </span>
        </div>
        {!media.bookPages ? (
          <p className="text-muted">Thư mục chưa có ảnh trang sách (_umlab/book). Mở sách PDF để làm bài.</p>
        ) : view === 'book' ? (
          <PageViewer kind="book" page={bookP} onPage={setBookP} />
        ) : (
          <PageViewer kind="keys" page={keyP} onPage={setKeyP} />
        )}
      </section>
    </div>
  );
}
