import { describe, expect, it } from 'vitest';
import { questionCount } from '@umlab/core';
import { BUILTIN_SETS, CURRICULUM, DOCS, VOCAB_CARDS, docSections, planFor } from './content';
import { VSTEP_MINDMAP, toPlainMarkdown } from './content/mindmap';
import { BOOK } from './content/book';
import { BOOK_TRACKS } from './content/tracks';
import { inlineTokens, plainText } from './rich';

describe('VSTEP – nội dung', () => {
  it('mọi liên kết trong lộ trình trỏ tới mục/đề có thật', () => {
    const tasks = new Set(BUILTIN_SETS.flatMap((s) => [...s.writing, ...s.speaking].map((t) => t.id)));
    const sets = new Set(BUILTIN_SETS.map((s) => s.id));
    for (const u of CURRICULUM) {
      if (!u.link) continue;
      const [kind, rest] = u.link.split(':');
      if (kind === 'doc') {
        const [d, s] = rest.split('#') as [keyof typeof DOCS, string];
        expect(DOCS[d], u.link).toBeTruthy();
        expect(
          docSections(DOCS[d]).some((x) => x.id === s),
          u.link,
        ).toBe(true);
      } else if (kind === 'track')
        expect(
          BOOK_TRACKS.some((t) => t.n === Number(rest)),
          u.link,
        ).toBe(true);
      else if (kind === 'set') expect(sets.has(rest), u.link).toBe(true);
      else if (kind === 'write' || kind === 'speak') expect(tasks.has(rest), u.link).toBe(true);
      else if (kind === 'book') {
        const [sk, sec] = rest.split('#') as [keyof typeof BOOK, string];
        expect(
          BOOK[sk].some((x) => x.id === sec),
          u.link,
        ).toBe(true);
      } else expect(['progress', 'cards']).toContain(kind);
    }
    expect(new Set(CURRICULUM.map((u) => u.id)).size).toBe(CURRICULUM.length);
  });

  it('id mục tài liệu không trùng, mục nào cũng có nội dung', () => {
    for (const d of Object.values(DOCS)) {
      const ids = docSections(d).map((s) => s.id);
      expect(new Set(ids).size, d.id).toBe(ids.length);
      for (const s of docSections(d)) expect(s.body.trim().length, `${d.id}:${s.id}`).toBeGreaterThan(80);
    }
  });

  it('bộ đề có sẵn hợp lệ; đề Đọc đủ 40 câu', () => {
    const r = BUILTIN_SETS.find((s) => s.id === 'builtin-reading-1')!;
    expect(r.sections).toHaveLength(4);
    expect(questionCount(r)).toBe(40);
    for (const s of BUILTIN_SETS)
      for (const sec of s.sections) for (const q of sec.questions) expect(q.answer).toBeLessThan(q.options.length);
  });

  it('89 track, trang sách tăng dần', () => {
    expect(BOOK_TRACKS).toHaveLength(89);
    for (let i = 1; i < BOOK_TRACKS.length; i++)
      expect(BOOK_TRACKS[i].page).toBeGreaterThanOrEqual(BOOK_TRACKS[i - 1].page);
    expect(BOOK_TRACKS[0].file).toBe('01-VSTEP-BAC-3-B1.mp3');
  });

  it('thẻ từ vựng có phiên âm dạng /…/', () => {
    expect(VOCAB_CARDS.length).toBeGreaterThan(150);
    for (const c of VOCAB_CARDS) if (c.ipa) expect(c.ipa, c.word).toMatch(/^\/.+\/$/);
  });

  it('lịch 08/11 → 05/12 xếp hết lộ trình', () => {
    const days = planFor({ startDate: '2026-11-08', examDate: '2026-12-05' });
    const ids = days.flatMap((d) => d.tasks.filter((t) => !t.daily && t.id !== 'exam-day').map((t) => t.id));
    expect(ids).toHaveLength(CURRICULUM.length);
    expect(days.at(-1)!.date).toBe('2026-12-05');
  });

  it('cú pháp từ vựng → HTML và chữ thuần', () => {
    const h = inlineTokens('Say {{hotel|/həʊˈtel/|khách sạn}} and [[Good morning]].');
    expect(h).toContain('data-say="hotel"');
    expect(h).toContain('/həʊˈtel/');
    expect(h).toContain('khách sạn');
    expect(h).toContain('data-say="Good morning"');
    expect(plainText('{{hotel|/həʊˈtel/|khách sạn}} **now**')).toBe('hotel now');
    expect(toPlainMarkdown('~~~say\nHi | Chào\n~~~')).toContain('**Hi** - Chào');
  });

  it('sơ đồ tư duy có đủ 6 nhánh tài liệu + lịch', () => {
    const branches = VSTEP_MINDMAP.nodes.filter((n) => n.kind === 'branch');
    expect(branches).toHaveLength(7);
  });
});
