import {
  buildStudyPlan,
  vstepSetSchema,
  type PlanDay,
  type PlanUnit,
  type VstepSet,
  type VstepState,
} from '@umlab/core';
import { grammarDoc } from './grammar';
import { listeningDoc } from './listening';
import { readingDoc } from './reading';
import { listeningTts1, speakingSet, writingSet } from './sets-other';
import { readingSet1 } from './sets-reading';
import { speakingDoc } from './speaking';
import { BOOK_TRACKS } from './tracks';
import type { DocId, VDoc } from './types';
import { vocabDoc } from './vocab';
import { writingDoc } from './writing';

export const DOCS: Record<DocId, VDoc> = {
  listening: listeningDoc,
  reading: readingDoc,
  writing: writingDoc,
  speaking: speakingDoc,
  grammar: grammarDoc,
  vocab: vocabDoc,
};

export const docSections = (d: VDoc) => d.parts.flatMap((p) => p.sections);
export const sectionKey = (doc: DocId, section: string) => `${doc}:${section}`;

export const BUILTIN_SETS: VstepSet[] = [readingSet1, listeningTts1, writingSet, speakingSet].map((s) =>
  vstepSetSchema.parse(s),
);

// ---------------- thẻ từ vựng (lấy từ mọi khối ~~~vocab) ----------------

export interface VocabCard {
  id: string;
  word: string;
  ipa: string;
  pos: string;
  mean: string;
  example: string;
  exampleVi: string;
  source: string;
}

function collectCards(): VocabCard[] {
  const out: VocabCard[] = [];
  const seen = new Set<string>();
  for (const d of Object.values(DOCS))
    for (const s of docSections(d)) {
      const re = /^~~~vocab[^\n]*\n([\s\S]*?)^~~~/gm;
      for (let m = re.exec(s.body); m; m = re.exec(s.body))
        for (const line of m[1].split('\n')) {
          const c = line.split('|').map((x) => x.trim());
          if (!c[0] || !c[3] || c[0].includes(' / ') || c[0].includes('…')) continue;
          const id = c[0].toLowerCase();
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            word: c[0],
            ipa: c[1] ? (c[1].startsWith('/') ? c[1] : `/${c[1]}/`) : '',
            pos: c[2] ?? '',
            mean: c[3],
            example: c[4]?.startsWith('=') || c[4]?.startsWith('→') ? '' : (c[4] ?? ''),
            exampleVi: c[5] ?? '',
            source: s.title,
          });
        }
    }
  return out;
}

export const VOCAB_CARDS = collectCards();

// ---------------- lộ trình cho lịch học ----------------

const doc = (d: DocId, s: string) => `doc:${d}#${s}`;
const U = (
  phase: 1 | 2 | 3 | 4,
  skill: PlanUnit['skill'],
  id: string,
  title: string,
  minutes: number,
  link?: string,
  detail?: string,
): PlanUnit => ({ id, phase, skill, title, minutes, link, detail });

function trackUnits(phase: 1 | 2 | 3 | 4, from: number, to: number, per: number): PlanUnit[] {
  const out: PlanUnit[] = [];
  for (let a = from; a <= to; a += per) {
    const b = Math.min(to, a + per - 1);
    const t = BOOK_TRACKS.find((x) => x.n === a)!;
    out.push(
      U(
        phase,
        t.skill,
        `track-${a}-${b}`,
        `Track ${a}${b > a ? `–${b}` : ''}: ${t.groupTitle}`,
        25 * (b - a + 1),
        `track:${a}`,
        `Trang sách ${t.page}. Nghe 1 lần → chấm → nghe lại có lời thoại.`,
      ),
    );
  }
  return out;
}

const W = writingSet.writing ?? [];
const SP = speakingSet.speaking ?? [];
const writeUnit = (phase: 1 | 2 | 3 | 4, id: string) => {
  const w = W.find((x) => x.id === id)!;
  return U(phase, 'writing', `write-${id}`, `Viết Task ${w.task}: ${w.title}`, w.task === 1 ? 30 : 50, `write:${id}`);
};
const speakUnit = (phase: 1 | 2 | 3 | 4, id: string) => {
  const s = SP.find((x) => x.id === id)!;
  return U(phase, 'speaking', `speak-${id}`, `Nói Part ${s.part}: ${s.topic}`, 20, `speak:${id}`);
};

export const CURRICULUM: PlanUnit[] = [
  // ---- Giai đoạn 1: nền tảng & template ----
  U(1, 'listening', 'd-l1', 'Đọc: Tổng quan bài thi Nghe + mục tiêu điểm', 20, doc('listening', 'l1-structure')),
  U(1, 'reading', 'd-r1', 'Đọc: Tổng quan bài thi Đọc + skimming/scanning', 20, doc('reading', 'r1-structure')),
  U(1, 'writing', 'd-w1', 'Đọc: Cấu trúc bài Viết, cách chấm, chiến lược 60 phút', 20, doc('writing', 'w1-structure')),
  U(1, 'speaking', 'd-s1', 'Đọc: Cấu trúc bài Nói + công thức A-R-E', 20, doc('speaking', 's1-structure')),
  U(1, 'grammar', 'g-present', 'Ngữ pháp: Hiện tại đơn – tiếp diễn', 20, doc('grammar', 'g1-present')),
  U(1, 'grammar', 'g-past', 'Ngữ pháp: Quá khứ đơn – hiện tại hoàn thành', 25, doc('grammar', 'g1-past')),
  U(1, 'grammar', 'g-future', 'Ngữ pháp: will / be going to', 15, doc('grammar', 'g1-future')),
  U(1, 'grammar', 'g-compare', 'Ngữ pháp: So sánh', 15, doc('grammar', 'g2-compare')),
  U(1, 'grammar', 'g-cond', 'Ngữ pháp: Câu điều kiện loại 1, 2', 20, doc('grammar', 'g2-conditional')),
  U(1, 'grammar', 'g-ving', 'Ngữ pháp: V-ing / to V + động từ khuyết thiếu', 20, doc('grammar', 'g2-ving')),
  U(1, 'writing', 'd-w2-uni', 'Học thuộc: Template vạn năng Task 1', 30, doc('writing', 'w2-universal')),
  U(1, 'writing', 'd-w2-inf', 'Học: Thư thân mật + bài mẫu', 30, doc('writing', 'w2-informal')),
  U(1, 'writing', 'd-w2-for', 'Học: Thư trang trọng + bài mẫu', 30, doc('writing', 'w2-formal')),
  U(1, 'writing', 'd-w3-uni', 'Học thuộc: Template 4 đoạn Task 2', 30, doc('writing', 'w3-universal')),
  U(1, 'writing', 'd-w3-types', 'Học: Biến thể template theo dạng đề', 25, doc('writing', 'w3-types')),
  U(1, 'speaking', 'd-s2-1', 'Học thuộc: Part 1 dạng 1–2 (sở thích, so sánh)', 25, doc('speaking', 's2-type1')),
  U(1, 'speaking', 'd-s2-3', 'Học thuộc: Part 1 dạng 3–4 (ý kiến, tần suất)', 25, doc('speaking', 's2-type3')),
  U(
    1,
    'speaking',
    'd-s2-5',
    'Học thuộc: Part 1 dạng 5–8 (mô tả, tương lai, câu hỏi lạ)',
    25,
    doc('speaking', 's2-type5'),
  ),
  U(1, 'speaking', 'd-s3', 'Học thuộc: Template Part 2 + bài mẫu', 25, doc('speaking', 's3-template')),
  U(1, 'speaking', 'd-s4', 'Học thuộc: Template Part 3 + bài mẫu', 25, doc('speaking', 's4-template')),
  U(1, 'listening', 'd-l2-p1', 'Học: Part 1 – câu hỏi tổng quan', 25, doc('listening', 'l2-part1-general')),
  U(1, 'listening', 'd-l2-p1d', 'Học: Part 1 – câu hỏi chi tiết', 25, doc('listening', 'l2-part1-detail')),
  ...trackUnits(1, 1, 14, 2),
  U(1, 'reading', 'd-r2-vocab', 'Học: Câu hỏi từ vựng', 20, doc('reading', 'r2-vocab')),
  U(1, 'reading', 'd-r2-main', 'Học: Câu hỏi ý chính + chi tiết', 25, doc('reading', 'r2-main')),
  U(1, 'speaking', 'd-pron', 'Phát âm: âm cuối, -s, -ed, trọng âm', 20, doc('speaking', 's4-pron')),

  // ---- Giai đoạn 2: luyện từng phần ----
  U(2, 'listening', 'd-l2-dis', 'Học: Bẫy từ đánh lạc hướng', 15, doc('listening', 'l2-distractors')),
  U(2, 'listening', 'd-l2-p2', 'Học: Part 2 – hội thoại dài', 20, doc('listening', 'l2-part2')),
  U(2, 'listening', 'd-l2-p3', 'Học: Part 3 – bài giảng', 20, doc('listening', 'l2-part3')),
  ...trackUnits(2, 15, 54, 3),
  U(2, 'reading', 'd-r2-neg', 'Học: Câu hỏi NOT/EXCEPT + tham chiếu', 20, doc('reading', 'r2-negative')),
  U(2, 'reading', 'd-r2-inf', 'Học: Suy luận, mục đích, chèn câu', 25, doc('reading', 'r2-inference')),
  U(2, 'reading', 'set-r1-p12', 'Làm đề Đọc mẫu 1 (chỉ bài 1–2, 26 phút)', 30, 'set:builtin-reading-1'),
  U(2, 'grammar', 'g-passive', 'Ngữ pháp: Câu bị động', 20, doc('grammar', 'g2-passive')),
  U(2, 'grammar', 'g-rel', 'Ngữ pháp: Mệnh đề quan hệ', 20, doc('grammar', 'g2-relative')),
  U(2, 'grammar', 'g-link', 'Ngữ pháp: Từ nối, câu phức', 20, doc('grammar', 'g2-linking')),
  U(2, 'grammar', 'g-nouns', 'Ngữ pháp: Danh từ, mạo từ, câu hỏi', 20, doc('grammar', 'g2-nouns')),
  ...['w1-camping', 'w1-scholar', 'w1-landlord', 'w1-tour', 'w1-food'].map((id) => writeUnit(2, id)),
  ...['w2-online', 'w2-social', 'w2-free-uni'].map((id) => writeUnit(2, id)),
  ...['p1-hometown', 'p1-studies', 'p1-routine', 'p1-food', 'p1-friends', 'p1-travel'].map((id) => speakUnit(2, id)),
  ...['p2-gift', 'p2-holiday', 'p2-graduate', 'p2-neighbour'].map((id) => speakUnit(2, id)),
  ...['p3-exercise', 'p3-pairs', 'p3-tech', 'p3-socialmedia'].map((id) => speakUnit(2, id)),
  ...trackUnits(2, 65, 89, 5),

  // ---- Giai đoạn 3: luyện đề tổng hợp ----
  ...trackUnits(3, 55, 64, 3),
  U(3, 'listening', 'set-l-tts', 'Làm đề Nghe mô phỏng 1 (canh giờ)', 30, 'set:builtin-listening-tts-1'),
  U(3, 'reading', 'set-r1-full', 'Làm trọn đề Đọc mẫu 1 trong 60 phút', 65, 'set:builtin-reading-1'),
  ...['w1-club', 'w1-habit', 'w1-library'].map((id) => writeUnit(3, id)),
  ...['w2-vocational', 'w2-abroad', 'w2-stress', 'w2-plastic'].map((id) => writeUnit(3, id)),
  ...['p1-weather', 'p1-health', 'p1-social', 'p1-holiday'].map((id) => speakUnit(3, id)),
  ...['p2-lottery', 'p2-plastic', 'p2-transport', 'p2-skill'].map((id) => speakUnit(3, id)),
  ...['p3-extra', 'p3-time', 'p3-balance', 'p3-transport', 'p3-env', 'p3-reading'].map((id) => speakUnit(3, id)),

  // ---- Giai đoạn 4: ôn tập & thi thử ----
  U(4, 'listening', 'd-l3', 'Đọc: Xu hướng + bí quyết phòng thi Nghe', 15, doc('listening', 'l3-trends')),
  U(4, 'reading', 'd-r3', 'Đọc: Xu hướng + bí quyết phòng thi Đọc', 15, doc('reading', 'r3-trends')),
  U(4, 'writing', 'd-w4', 'Đọc: Xu hướng + 12 đề dự đoán Viết', 15, doc('writing', 'w4-trends')),
  U(4, 'speaking', 'd-s5', 'Đọc: Xu hướng + đề dự đoán Nói', 15, doc('speaking', 's5-trends')),
  U(4, 'mock', 'mock-writing', 'Thi thử Viết: Task 1 + Task 2 trong 60 phút', 60, 'write:w2-salary'),
  U(4, 'mock', 'mock-speaking', 'Thi thử Nói: Part 1 + 2 + 3 (ghi âm, nghe lại)', 20, 'speak:p3-env'),
  U(4, 'review', 'review-templates', 'Ôn lại toàn bộ template Viết + Nói (đọc to)', 40, doc('writing', 'w3-checklist')),
  U(4, 'review', 'review-errors', 'Xem lại câu sai trong mục Tiến độ của từng kỹ năng', 30, 'progress'),
];

export const DAILY_UNITS: Omit<PlanUnit, 'phase'>[] = [
  { id: 'cards', skill: 'vocab', title: 'Ôn thẻ từ vựng (15 phút)', minutes: 15, link: 'cards' },
];

export function planFor(s: Pick<VstepState, 'startDate' | 'examDate'>): PlanDay[] {
  return buildStudyPlan({ start: s.startDate, exam: s.examDate, units: CURRICULUM, daily: DAILY_UNITS });
}
