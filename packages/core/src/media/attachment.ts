// Ảnh đính kèm (dán Ctrl+V / kéo thả / chọn tệp) ngoài khung vẽ: đặc tả use case, task Gantt…
// Ảnh lưu thẳng trong Y.Doc dạng data URL đã nén (≤ 1 MB, xem normalizeImage ở renderer).
import { z } from 'zod';

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** data:image/...;base64,... */
  src: z.string().regex(/^data:image\//, 'Ảnh không hợp lệ'),
  w: z.number(),
  h: z.number(),
  caption: z.string().optional(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

/** Lọc danh sách ảnh hợp lệ từ dữ liệu bất kỳ (dữ liệu cũ / nhập tệp). */
export function normAttachments(v: unknown): Attachment[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => attachmentSchema.safeParse(x)).flatMap((r) => (r.success ? [r.data] : []));
}
