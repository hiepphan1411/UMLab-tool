import { describe, expect, it } from 'vitest';
import {
  VstepImportError,
  addDays,
  bandFromRaw,
  buildStudyPlan,
  daysBetween,
  levelOf,
  normVstepState,
  overallBand,
  parseVstepSets,
  phaseLengths,
  planProgress,
  rawForBand,
  streak,
  type PlanUnit,
} from '../src';

const SET = {
  id: 'r1',
  title: 'Đọc 1',
  skill: 'reading',
  sections: [
    {
      title: 'Passage 1',
      passage: 'Text',
      questions: [
        { prompt: 'Q1', options: ['a', 'b', 'c', 'd'], answer: 'C' },
        { prompt: 'Q2', options: ['a', 'b'], answer: 1 },
      ],
    },
  ],
};

describe('VSTEP – nhập bộ đề JSON', () => {
  it('nhận một bộ, mảng, hoặc { sets }; đổi đáp án chữ sang chỉ số', () => {
    const [a] = parseVstepSets(JSON.stringify(SET));
    expect(a.sections[0].questions[0].answer).toBe(2);
    expect(a.sections[0].part).toBe(1);
    expect(parseVstepSets(JSON.stringify([SET, { ...SET, id: 'r2' }]))).toHaveLength(2);
    expect(parseVstepSets(JSON.stringify({ sets: [SET] }))[0].id).toBe('r1');
  });

  it('báo lỗi tiếng Việt kèm vị trí', () => {
    expect(() => parseVstepSets('{')).toThrow(VstepImportError);
    const bad = { ...SET, sections: [{ ...SET.sections[0], questions: [{ prompt: 'x', options: ['a'], answer: 0 }] }] };
    expect(() => parseVstepSets(JSON.stringify(bad))).toThrow(/ít nhất 2 lựa chọn.*sections\.0\.questions\.0\.options/);
    const out = {
      ...SET,
      sections: [{ ...SET.sections[0], questions: [{ prompt: 'x', options: ['a', 'b'], answer: 'D' }] }],
    };
    expect(() => parseVstepSets(JSON.stringify(out))).toThrow(/ngoài danh sách/);
    expect(() => parseVstepSets(JSON.stringify({ id: 'e', title: 'Rỗng' }))).toThrow(/chưa có phần nào/);
  });
});

describe('VSTEP – điểm', () => {
  it('quy đổi tuyến tính, làm tròn 0,5', () => {
    expect(bandFromRaw(35, 35)).toBe(10);
    expect(bandFromRaw(14, 35)).toBe(4);
    expect(bandFromRaw(16, 40)).toBe(4);
    expect(rawForBand(4, 35)).toBe(14);
    expect(rawForBand(5, 40)).toBe(19);
  });
  it('điểm tổng và bậc', () => {
    expect(overallBand({ listening: 4, reading: 4.5, writing: 5, speaking: 5 })).toBe(4.5);
    expect(overallBand({ listening: 4.5, reading: 4.5, writing: 5, speaking: 5 })).toBe(5);
    expect(overallBand({ listening: 3.5, reading: 3.5, writing: 4, speaking: 4 })).toBe(4);
    expect(overallBand({})).toBeNull();
    expect(levelOf(3.5)).toBe('Chưa đạt');
    expect(levelOf(4)).toBe('B1');
    expect(levelOf(6)).toBe('B2');
  });
});

describe('VSTEP – lịch học', () => {
  const units: PlanUnit[] = [];
  for (const phase of [1, 2, 3, 4] as const)
    for (const skill of ['listening', 'reading', 'writing', 'speaking'] as const)
      for (let i = 0; i < 4; i++) units.push({ id: `${skill}-${phase}-${i}`, skill, title: '', minutes: 30, phase });

  it('chia giai đoạn đủ số ngày', () => {
    expect(phaseLengths(26).reduce((a, b) => a + b, 0)).toBe(26);
    expect(phaseLengths(26).every((x) => x >= 1)).toBe(true);
    expect(phaseLengths(2)).toEqual([1, 1, 0, 0]);
    expect(phaseLengths(0)).toEqual([0, 0, 0, 0]);
  });

  it('xếp mọi đơn vị đúng một lần, xen kẽ kỹ năng, ngày cuối là ngày thi', () => {
    const days = buildStudyPlan({
      start: '2026-11-09',
      exam: '2026-12-05',
      units,
      daily: [{ id: 'vocab', skill: 'vocab', title: 'Từ vựng', minutes: 15 }],
    });
    expect(days).toHaveLength(daysBetween('2026-11-09', '2026-12-05') + 1);
    expect(days.at(-1)!.date).toBe('2026-12-05');
    expect(days.at(-1)!.phase).toBe(0);
    const ids = days.flatMap((d) => d.tasks.filter((t) => !t.daily && t.id !== 'exam-day').map((t) => t.id));
    expect(new Set(ids).size).toBe(units.length);
    expect(ids).toHaveLength(units.length);
    // đơn vị giai đoạn 1 không rơi vào ngày giai đoạn 3
    for (const d of days) for (const t of d.tasks) if (!t.daily && t.id !== 'exam-day') expect(t.phase).toBe(d.phase);
    expect(new Set(days[0].tasks.map((t) => t.skill)).size).toBeGreaterThanOrEqual(3);
    expect(days[0].tasks.some((t) => t.id === 'vocab@2026-11-09')).toBe(true);
  });

  it('lịch quá ngắn vẫn xếp hết đơn vị', () => {
    const days = buildStudyPlan({ start: '2026-11-09', exam: '2026-11-11', units });
    const ids = days.flatMap((d) => d.tasks.map((t) => t.id)).filter((x) => x !== 'exam-day');
    expect(ids).toHaveLength(units.length);
  });

  it('tiến độ và chuỗi ngày', () => {
    const days = buildStudyPlan({ start: '2026-11-09', exam: '2026-11-20', units });
    const first = days[0];
    const done = { [first.date]: { [first.tasks[0].id]: true } };
    expect(planProgress(days, done).done).toBe(1);
    expect(planProgress(days, done).total).toBe(units.length);
    const s = { '2026-11-08': { a: true }, '2026-11-09': { b: true } };
    expect(streak(s, '2026-11-09')).toBe(2);
    expect(streak(s, '2026-11-10')).toBe(2);
    expect(streak(s, '2026-11-12')).toBe(0);
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('chuẩn hoá trạng thái hỏng về mặc định', () => {
    const s = normVstepState({ examDate: 'x', sets: [{ bad: 1 }, SET] });
    expect(s.examDate).toBe('2026-12-05');
    const t = normVstepState({ sets: [{ bad: 1 }, SET], dailyMinutes: 120 });
    expect(t.sets).toHaveLength(1);
    expect(t.dailyMinutes).toBe(120);
  });
});
