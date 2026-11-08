import { Check, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, Segmented } from '@/ui';
import { Bar, Panel, completeDaily } from './common';
import { VOCAB_CARDS, type VocabCard } from './content';
import { useActiveKeys } from './layout';
import { Rich } from './rich';
import { sayNow } from './speech';
import { useVstep } from './store';

/** Khoảng ôn lại theo hộp Leitner (ngày). */
const GAP = [0, 1, 2, 4, 7, 14];
const DAY = 86_400_000;
const GOAL = 20;

export function CardsView() {
  const cards = useVstep((s) => s.state!.cards);
  const myWords = useVstep((s) => s.state!.myWords);
  const ALL = useMemo<VocabCard[]>(
    () => [
      ...myWords.map((w) => ({
        id: 'my:' + w.word.toLowerCase(),
        word: w.word,
        ipa: w.ipa,
        pos: '',
        mean: w.mean,
        example: '',
        exampleVi: '',
        source: 'Từ của tôi (bôi đen để thêm)',
      })),
      ...VOCAB_CARDS,
    ],
    [myWords],
  );
  const [mode, setMode] = useState<'due' | 'all'>('due');
  const [flip, setFlip] = useState(false);
  const [done, setDone] = useState(0);
  const now = Date.now();
  const queue = useMemo(() => {
    const due = ALL.filter((c) => (cards[c.id]?.due ?? 0) <= now);
    // chưa học trước, rồi tới thẻ đến hạn
    due.sort(
      (a, b) => (cards[a.id] ? 1 : 0) - (cards[b.id] ? 1 : 0) || (cards[a.id]?.due ?? 0) - (cards[b.id]?.due ?? 0),
    );
    return mode === 'due' ? due : ALL;
  }, [mode, done, ALL]); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  const card: VocabCard | undefined = queue[idx % Math.max(1, queue.length)];
  const learned = ALL.filter((c) => (cards[c.id]?.box ?? 0) >= 2).length;

  useEffect(() => {
    if (card && !flip) sayNow(card.word);
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (ok: boolean) => {
    if (!card) return;
    useVstep.getState().update((s) => {
      const box = ok ? Math.min(5, (s.cards[card.id]?.box ?? 0) + 1) : 0;
      s.cards[card.id] = { box, due: Date.now() + GAP[box] * DAY };
      if (done + 1 >= GOAL) completeDaily(s, 'cards');
    });
    setDone((d) => d + 1);
    setFlip(false);
    if (mode === 'all') setIdx((i) => i + 1);
  };

  useActiveKeys((e) => {
    {
      if (e.code === 'Space') {
        e.preventDefault();
        setFlip((f) => !f);
      }
      if (flip && (e.key === '1' || e.key === 'ArrowLeft')) answer(false);
      if (flip && (e.key === '2' || e.key === 'ArrowRight')) answer(true);
    }
  });

  return (
    <div className="vs-page vs-narrow">
      <div className="vs-stats">
        <div className="vs-stat">
          <span>Đã thuộc (hộp ≥ 2)</span>
          <b>
            {learned}/{ALL.length}
          </b>
          <Bar value={learned} max={ALL.length} tone="ok" />
        </div>
        <div className="vs-stat">
          <span>Hôm nay đã ôn</span>
          <b>
            {done}/{GOAL}
          </b>
          <Bar value={done} max={GOAL} />
        </div>
        <div className="vs-stat">
          <span>Thẻ đến hạn</span>
          <b>{ALL.filter((c) => (cards[c.id]?.due ?? 0) <= now).length}</b>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Segmented<'due' | 'all'>
          value={mode}
          onChange={(m) => (setMode(m), setIdx(0), setFlip(false))}
          options={[
            { value: 'due', label: 'Thẻ cần ôn' },
            { value: 'all', label: 'Xem lần lượt tất cả' },
          ]}
        />
        <span className="vs-muted-line">Space: lật thẻ; 1 / ←: chưa nhớ; 2 / →: nhớ rồi.</span>
      </div>
      {card ? (
        <div className={cn('vs-flash', flip && 'flip')} onClick={() => setFlip((f) => !f)} role="button" tabIndex={0}>
          <div className="vs-flash-word">
            {card.word}
            <button
              className="vt-say"
              onClick={(e) => (e.stopPropagation(), sayNow(card.word))}
              aria-label="Nghe"
              title="Nghe"
            >
              <Volume2 size={14} />
            </button>
          </div>
          {card.ipa && <div className="vs-flash-ipa">{card.ipa}</div>}
          {flip ? (
            <div className="vs-flash-back" onClick={(e) => e.stopPropagation()}>
              <div className="vs-flash-mean">
                {card.pos && <span className="text-muted">({card.pos}) </span>}
                {card.mean}
              </div>
              {card.example && (
                <Rich src={'~~~say\n' + card.example + (card.exampleVi ? ' | ' + card.exampleVi : '') + '\n~~~'} />
              )}
              <div className="vs-muted-line">Chủ đề: {card.source}</div>
              <div className="vs-flash-btns">
                <Button icon={<X />} onClick={() => answer(false)}>
                  Chưa nhớ
                </Button>
                <Button variant="primary" icon={<Check />} onClick={() => answer(true)}>
                  Nhớ rồi
                </Button>
              </div>
            </div>
          ) : (
            <div className="vs-flash-hint">Đoán nghĩa rồi bấm để lật thẻ</div>
          )}
        </div>
      ) : (
        <Panel title="Hết thẻ cần ôn hôm nay">
          <p>Bạn đã ôn hết thẻ đến hạn. Thẻ trả lời đúng sẽ quay lại sau 1, 2, 4, 7, 14 ngày.</p>
          <Button icon={<RotateCcw />} onClick={() => setMode('all')}>
            Xem lại tất cả
          </Button>
        </Panel>
      )}
    </div>
  );
}
