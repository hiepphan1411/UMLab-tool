// Ôn thi VSTEP: định dạng JSON của bộ đề (nhập/xuất) và trạng thái học của từng tài khoản.
// Bộ đề nhập từ tệp do người dùng soạn → validate bằng zod, thông báo lỗi tiếng Việt kèm đường dẫn trường.
import { z } from 'zod';

export const VSTEP_SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
export type VstepSkill = (typeof VSTEP_SKILLS)[number];

export const VSTEP_SKILL_LABEL: Record<VstepSkill, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
  speaking: 'Nói',
};

const id = z.string().trim().min(1).max(80);
const text = (max = 20_000) => z.string().max(max);

export const vstepQuestionSchema = z.object({
  id: id.optional(),
  prompt: text(2000),
  options: z.array(text(500)).min(2, 'Câu hỏi cần ít nhất 2 lựa chọn').max(6),
  /** Chỉ số đáp án đúng (0 = A). Cho phép ghi "A"/"B"/"C"/"D". */
  answer: z
    .union([z.number().int().min(0).max(5), z.enum(['A', 'B', 'C', 'D', 'E', 'F'])])
    .transform((v) => (typeof v === 'number' ? v : 'ABCDEF'.indexOf(v))),
  explain: text(4000).optional(),
});
export type VstepQuestion = z.infer<typeof vstepQuestionSchema>;

export const vstepSectionSchema = z.object({
  id: id.optional(),
  title: text(300),
  part: z.number().int().min(1).max(4).default(1),
  instructions: text(2000).optional(),
  /** Tệp âm thanh: tên tệp trong thư mục tài liệu (vd "01-VSTEP-BAC-3-B1.mp3") hoặc URL https. */
  audio: text(1000).optional(),
  /** Lời thoại đọc bằng giọng máy khi không có tệp âm thanh. Dòng "Man:"/"Woman:" đổi giọng. */
  tts: text(20_000).optional(),
  /** Lời thoại hiện sau khi nộp bài. */
  script: text(20_000).optional(),
  /** Bài đọc (Markdown). */
  passage: text(30_000).optional(),
  questions: z.array(vstepQuestionSchema).min(1, 'Phần thi cần ít nhất 1 câu hỏi').max(60),
});
export type VstepSection = z.infer<typeof vstepSectionSchema>;

export const WRITING_KINDS = [
  'informal',
  'semi-formal',
  'formal',
  'opinion',
  'adv-dis',
  'problem-solution',
  'discussion',
  'cause-effect',
  'other',
] as const;
export type WritingKind = (typeof WRITING_KINDS)[number];

export const WRITING_KIND_LABEL: Record<WritingKind, string> = {
  informal: 'Thư thân mật',
  'semi-formal': 'Thư bán trang trọng',
  formal: 'Thư trang trọng',
  opinion: 'Nêu quan điểm',
  'adv-dis': 'Ưu – nhược điểm',
  'problem-solution': 'Vấn đề – giải pháp',
  discussion: 'Thảo luận hai mặt',
  'cause-effect': 'Nguyên nhân – kết quả',
  other: 'Khác',
};

export const vstepWritingSchema = z.object({
  id,
  task: z.union([z.literal(1), z.literal(2)]),
  kind: z.enum(WRITING_KINDS).default('other'),
  title: text(300).optional(),
  prompt: text(6000),
  minWords: z.number().int().min(50).max(600).default(120),
  minutes: z.number().int().min(5).max(90).optional(),
  outline: text(8000).optional(),
  sample: text(12_000).optional(),
});
export type VstepWriting = z.infer<typeof vstepWritingSchema>;

export const vstepSpeakingSchema = z.object({
  id,
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  topic: text(300),
  prompt: text(4000).optional(),
  questions: z.array(text(500)).max(12).optional(),
  options: z.array(text(500)).max(6).optional(),
  ideas: z.array(text(500)).max(6).optional(),
  followUps: z.array(text(500)).max(8).optional(),
  prepSec: z.number().int().min(0).max(600).optional(),
  speakSec: z.number().int().min(10).max(900).optional(),
  sample: text(12_000).optional(),
});
export type VstepSpeaking = z.infer<typeof vstepSpeakingSchema>;

export const vstepSetSchema = z
  .object({
    kind: z.literal('vstep-set').default('vstep-set'),
    version: z.literal(1).default(1),
    id,
    title: text(300).refine((s) => s.trim().length > 0, 'Thiếu tiêu đề bộ đề'),
    description: text(4000).optional(),
    skill: z.enum([...VSTEP_SKILLS, 'mixed']).default('mixed'),
    level: z.enum(['B1', 'B2', 'B1-B2', 'C1']).optional(),
    source: text(500).optional(),
    /** Thời gian làm bài (phút); trống = theo chuẩn VSTEP của kỹ năng. */
    minutes: z.number().int().min(1).max(240).optional(),
    sections: z.array(vstepSectionSchema).max(10).default([]),
    writing: z.array(vstepWritingSchema).max(40).default([]),
    speaking: z.array(vstepSpeakingSchema).max(80).default([]),
  })
  .refine((s) => s.sections.length + s.writing.length + s.speaking.length > 0, 'Bộ đề chưa có phần nào');
export type VstepSet = z.infer<typeof vstepSetSchema>;
export type VstepSetInput = z.input<typeof vstepSetSchema>;

export class VstepImportError extends Error {}

const MAX_BYTES = 10 * 1024 * 1024;

/** Đọc tệp JSON bộ đề: một bộ, mảng bộ, hoặc `{ sets: [...] }`. Ném VstepImportError (tiếng Việt) khi sai. */
export function parseVstepSets(textIn: string): VstepSet[] {
  if (textIn.length > MAX_BYTES) throw new VstepImportError('Tệp lớn hơn 10 MB.');
  let raw: unknown;
  try {
    raw = JSON.parse(textIn.replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new VstepImportError('Tệp không phải JSON hợp lệ: ' + (e as Error).message);
  }
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { sets?: unknown }).sets)
      ? (raw as { sets: unknown[] }).sets
      : [raw];
  if (!list.length) throw new VstepImportError('Tệp không có bộ đề nào.');
  return list.map((item, i) => {
    const r = vstepSetSchema.safeParse(item);
    if (r.success) return checkAnswers(r.data);
    const iss = r.error.issues[0];
    const where = iss?.path.length ? ` (trường ${iss.path.join('.')})` : '';
    throw new VstepImportError(`Bộ đề thứ ${i + 1}: ${iss?.message ?? 'không hợp lệ'}${where}`);
  });
}

function checkAnswers(s: VstepSet): VstepSet {
  s.sections.forEach((sec, si) =>
    sec.questions.forEach((q, qi) => {
      if (q.answer < 0 || q.answer >= q.options.length)
        throw new VstepImportError(`“${s.title}”: phần ${si + 1}, câu ${qi + 1} có đáp án ngoài danh sách lựa chọn.`);
    }),
  );
  return s;
}

export const questionCount = (s: Pick<VstepSet, 'sections'>) =>
  s.sections.reduce((n, sec) => n + sec.questions.length, 0);

// ---------------- trạng thái học ----------------

const ts = z.number().finite();

export const vstepAttemptSchema = z.object({
  id: z.string(),
  setId: z.string(),
  setTitle: z.string().default(''),
  skill: z.enum([...VSTEP_SKILLS, 'mixed']),
  at: ts,
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  durationSec: z.number().min(0).default(0),
  /** Lựa chọn theo thứ tự câu (−1 = bỏ trống). */
  answers: z.array(z.number().int()).default([]),
});
export type VstepAttempt = z.infer<typeof vstepAttemptSchema>;

export const vstepWritingLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string().default(''),
  task: z.union([z.literal(1), z.literal(2)]),
  text: z.string().max(20_000),
  words: z.number().int().min(0),
  at: ts,
  durationSec: z.number().min(0).default(0),
  /** Tự chấm theo 4 tiêu chí (0–10), trống = chưa chấm. */
  self: z.number().min(0).max(10).nullable().default(null),
});
export type VstepWritingLog = z.infer<typeof vstepWritingLogSchema>;

export const vstepSpeakingLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  part: z.number().int().min(1).max(3),
  topic: z.string().default(''),
  at: ts,
  durationSec: z.number().min(0).default(0),
  self: z.number().min(0).max(10).nullable().default(null),
});
export type VstepSpeakingLog = z.infer<typeof vstepSpeakingLogSchema>;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const vstepStateSchema = z.object({
  v: z.literal(1).default(1),
  examDate: dateKey.default('2026-12-05'),
  startDate: dateKey.default('2026-11-09'),
  dailyMinutes: z.number().int().min(30).max(600).default(150),
  target: z.enum(['B1', 'B2']).default('B1'),
  /** Mục tài liệu đã đánh dấu "đã học": id mục → thời điểm. */
  learned: z.record(ts).default({}),
  /** Việc trong lịch đã xong: ngày → id việc → true. */
  plan: z.record(z.record(z.boolean())).default({}),
  custom: z
    .record(z.array(z.object({ id: z.string(), title: z.string().max(300), done: z.boolean().default(false) })))
    .default({}),
  notes: z.record(z.string().max(5000)).default({}),
  attempts: z.array(vstepAttemptSchema).default([]),
  /** Track trong sách: số track → đã nghe + tự chấm. */
  tracks: z
    .record(
      z.object({
        done: z.boolean().default(false),
        correct: z.number().int().min(0).nullable().default(null),
        total: z.number().int().min(0).nullable().default(null),
        at: ts.default(0),
      }),
    )
    .default({}),
  writings: z.array(vstepWritingLogSchema).default([]),
  speaking: z.array(vstepSpeakingLogSchema).default([]),
  /** Bộ đề người dùng nhập từ JSON. */
  sets: z.array(z.unknown()).default([]),
  /** Từ vựng: id → hộp Leitner (0–5) + lần ôn tới. */
  cards: z.record(z.object({ box: z.number().int().min(0).max(5), due: ts })).default({}),
  updatedAt: ts.default(0),
});
export type VstepState = z.infer<typeof vstepStateSchema>;

/** Chuẩn hoá trạng thái đọc từ tệp/DB (trường thiếu → mặc định; bộ đề hỏng bị bỏ). */
export function normVstepState(raw: unknown): VstepState {
  const r = vstepStateSchema.safeParse(raw && typeof raw === 'object' ? raw : {});
  const s = r.success ? r.data : vstepStateSchema.parse({});
  s.sets = s.sets.filter((x) => vstepSetSchema.safeParse(x).success);
  return s;
}

export function importedSets(s: VstepState): VstepSet[] {
  return s.sets.flatMap((x) => {
    const r = vstepSetSchema.safeParse(x);
    return r.success ? [r.data] : [];
  });
}
