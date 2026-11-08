// Ước tính điểm và tiến độ từ dữ liệu học (bài đã làm, tự chấm, mục tài liệu đã học).
import { bandFromRaw, overallBand, roundHalf, type VstepSkill, type VstepState } from '@umlab/core';
import { DOCS, docSections, sectionKey } from './content';
import type { DocId } from './content/types';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Điểm ước tính 0–10 của từng kỹ năng (null = chưa có dữ liệu). */
export function estimate(s: VstepState): Record<VstepSkill, number | null> {
  const byRaw = (skill: 'listening' | 'reading') => {
    const att = s.attempts.filter((a) => a.skill === skill && a.total > 0).slice(-3);
    const fromSets = att.map((a) => bandFromRaw(a.correct, a.total));
    const fromTracks =
      skill === 'listening'
        ? Object.entries(s.tracks)
            .filter(([n, t]) => Number(n) < 65 && t.total && t.correct != null)
            .map(([, t]) => t)
            .sort((a, b) => b.at - a.at)
            .slice(0, 5)
            .map((t) => bandFromRaw(t.correct!, t.total!))
        : [];
    const all = [...fromSets, ...fromTracks];
    const v = avg(all);
    return v == null ? null : roundHalf(v);
  };
  const bySelf = (logs: { self: number | null }[]) => {
    const v = avg(
      logs
        .filter((l) => l.self != null)
        .slice(-3)
        .map((l) => l.self!),
    );
    return v == null ? null : roundHalf(v);
  };
  return {
    listening: byRaw('listening'),
    reading: byRaw('reading'),
    writing: bySelf(s.writings),
    speaking: bySelf(s.speaking),
  };
}

export function overall(s: VstepState): number | null {
  return overallBand(estimate(s));
}

export function docProgress(s: VstepState, id: DocId): { done: number; total: number } {
  const secs = docSections(DOCS[id]);
  return { done: secs.filter((x) => s.learned[sectionKey(id, x.id)]).length, total: secs.length };
}

export function practiceCount(s: VstepState, skill: VstepSkill): number {
  if (skill === 'listening')
    return (
      s.attempts.filter((a) => a.skill === 'listening').length +
      Object.entries(s.tracks).filter(([n, t]) => Number(n) < 65 && t.done).length
    );
  if (skill === 'reading') return s.attempts.filter((a) => a.skill === 'reading').length;
  if (skill === 'writing') return s.writings.length;
  return s.speaking.length;
}
