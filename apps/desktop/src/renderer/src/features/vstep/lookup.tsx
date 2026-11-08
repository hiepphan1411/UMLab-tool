// Bôi đen chữ tiếng Anh bất kỳ trong mục Ôn VSTEP → popup: phiên âm IPA, nghĩa tiếng Việt, nghe, thêm vào thẻ từ.
// Nghĩa: tra từ điển có sẵn trong app trước (từ vựng các tài liệu), không có thì dịch trực tuyến qua main process.
import { BookmarkPlus, Check, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { call, errorText, umlab } from '@/lib/api';
import { VOCAB_CARDS } from './content';
import { loadIpa, sentenceIpa, wordIpa } from './ipa';
import { sayNow } from './speech';
import { useVstep } from './store';

interface Hit {
  text: string;
  x: number;
  y: number;
  below: boolean;
}

const LOCAL = new Map(VOCAB_CARDS.map((c) => [c.word.toLowerCase(), c]));

function clean(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9'.!?]+$/g, '')
    .trim();
}

export function SelectionLookup() {
  const [hit, setHit] = useState<Hit | null>(null);
  const [mean, setMean] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ipaReady, setIpaReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const saved = useVstep((s) =>
    hit ? s.state?.myWords.some((w) => w.word.toLowerCase() === hit.text.toLowerCase()) : false,
  );

  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node)) return;
      const t = e.target as HTMLElement;
      if (!t.closest('.vs-main, .vs-drawer') || t.closest('input, textarea, .an-layer.active')) return;
      setTimeout(() => {
        const sel = window.getSelection();
        const text = clean(sel?.toString() ?? '');
        if (!sel || sel.isCollapsed || !text || text.length > 120 || !/[A-Za-z]{2}/.test(text) || /[À-ỹ]/.test(text))
          return;
        const r = sel.getRangeAt(0).getBoundingClientRect();
        const below = r.bottom + 190 < window.innerHeight;
        setHit({
          text,
          x: Math.min(window.innerWidth - 340, Math.max(8, r.left + r.width / 2 - 160)),
          y: below ? r.bottom + 8 : r.top - 8,
          below,
        });
      }, 10);
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setHit(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHit(null);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!hit) return;
    let alive = true;
    setMean(null);
    setErr(null);
    void loadIpa().then(() => alive && setIpaReady(true));
    const local = LOCAL.get(hit.text.toLowerCase());
    if (local) setMean(local.mean);
    else
      call(umlab.vstep.translate(hit.text))
        .then((m) => alive && setMean(m || '(không có kết quả)'))
        .catch((e) => alive && setErr(errorText(e)));
    return () => {
      alive = false;
    };
  }, [hit]);

  if (!hit) return null;
  const local = LOCAL.get(hit.text.toLowerCase());
  const single = !/\s/.test(hit.text);
  const ipa =
    local?.ipa ||
    (ipaReady ? (single ? (wordIpa(hit.text) ? `/${wordIpa(hit.text)}/` : '') : `/${sentenceIpa(hit.text)}/`) : '');

  const add = () =>
    useVstep.getState().update((s) => {
      if (s.myWords.some((w) => w.word.toLowerCase() === hit.text.toLowerCase())) return;
      s.myWords.push({ word: hit.text, ipa, mean: mean ?? '', at: Date.now() });
    });

  return (
    <div
      ref={box}
      className="vs-lookup"
      style={{ left: hit.x, top: hit.y, transform: hit.below ? undefined : 'translateY(-100%)' }}
      role="dialog"
      aria-label="Tra từ"
    >
      <div className="vs-lookup-head">
        <b className="vs-lookup-word">{hit.text}</b>
        <button className="vt-say" onClick={() => sayNow(hit.text)} aria-label="Nghe" title="Nghe">
          <Volume2 size={13} />
        </button>
        <button className="ibtn" onClick={() => setHit(null)} aria-label="Đóng">
          <X size={14} />
        </button>
      </div>
      {ipa && (
        <div className="vs-lookup-ipa">
          {ipa}
          {!local?.ipa && <span className="text-muted"> (Mỹ)</span>}
        </div>
      )}
      <div className="vs-lookup-mean">
        {local?.pos && <span className="text-muted">({local.pos}) </span>}
        {err ? <span className="text-danger">{err}</span> : (mean ?? <span className="text-muted">Đang dịch…</span>)}
      </div>
      {local?.example && <div className="vs-lookup-ex">{local.example}</div>}
      <div className="vs-lookup-foot">
        <span className="text-muted">{local ? 'Từ điển trong app' : 'Dịch trực tuyến'}</span>
        <button className="btn sm" onClick={add} disabled={saved || !mean}>
          {saved ? <Check size={13} /> : <BookmarkPlus size={13} />}
          {saved ? 'Đã thêm' : 'Thêm vào thẻ từ'}
        </button>
      </div>
    </div>
  );
}
