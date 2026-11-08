// Quy đổi điểm VSTEP (bậc 3–5): mỗi kỹ năng 0–10, làm tròn 0,5; điểm tổng = trung bình 4 kỹ năng, làm tròn 0,5.
// Quy đổi số câu đúng Nghe/Đọc → điểm là ƯỚC TÍNH tuyến tính (đề thật không công bố bảng quy đổi cố định).
import type { VstepSkill } from './schema';

export const roundHalf = (x: number) => Math.round(x * 2) / 2;

/** Số câu chuẩn của đề thật. */
export const VSTEP_TOTAL: Record<'listening' | 'reading', number> = { listening: 35, reading: 40 };

/** Thời gian chuẩn (phút). */
export const VSTEP_MINUTES: Record<VstepSkill, number> = { listening: 40, reading: 60, writing: 60, speaking: 12 };

/** Điểm 0–10 từ số câu đúng / tổng số câu. */
export function bandFromRaw(correct: number, total: number): number {
  if (total <= 0) return 0;
  return roundHalf(Math.min(10, Math.max(0, (correct / total) * 10)));
}

/** Số câu đúng tối thiểu để đạt `band` trên đề `total` câu (theo quy đổi tuyến tính). */
export function rawForBand(band: number, total: number): number {
  for (let c = 0; c <= total; c++) if (bandFromRaw(c, total) >= band) return c;
  return total;
}

export type VstepLevel = 'Chưa đạt' | 'B1' | 'B2' | 'C1';

export function levelOf(overall: number): VstepLevel {
  if (overall >= 8.5) return 'C1';
  if (overall >= 6) return 'B2';
  if (overall >= 4) return 'B1';
  return 'Chưa đạt';
}

/** Điểm tổng từ 4 kỹ năng (kỹ năng chưa có điểm → bỏ qua; không có gì → null). */
export function overallBand(scores: Partial<Record<VstepSkill, number | null>>): number | null {
  const v = Object.values(scores).filter((x): x is number => typeof x === 'number');
  if (!v.length) return null;
  return roundHalf(v.reduce((a, b) => a + b, 0) / v.length);
}

/**
 * Mục tiêu từng kỹ năng cho người mất gốc lấy B1: Nghe/Đọc ~4,5 (16/35, 18/40), Viết/Nói 5,0 nhờ template.
 * Trung bình 4,75 → làm tròn 5,0 (dư 1 bậc an toàn so với ngưỡng 4,0).
 */
export const B1_PLAN: Record<VstepSkill, number> = { listening: 4.5, reading: 4.5, writing: 5, speaking: 5 };
export const B2_PLAN: Record<VstepSkill, number> = { listening: 6, reading: 6, writing: 6, speaking: 6.5 };
