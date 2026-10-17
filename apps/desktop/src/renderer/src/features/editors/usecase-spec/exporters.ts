// Xuất đặc tả DOCX / Markdown (một hoặc nhiều đặc tả) — dùng ở editor và dashboard (chọn nhiều → Xuất DOCX).
import type * as Y from 'yjs';
import { diagramsMap, readSpec, specContext, specToMarkdown, specsDocx } from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { toast } from '@/ui';

const fileName = (p: string) => p.split('/').pop()!.split(String.fromCharCode(92)).pop()!;

export async function exportSpecsDocx(doc: Y.Doc, diagramIds: string[]): Promise<void> {
  const ids = diagramIds.filter((id) => diagramsMap(doc).get(id)?.type === 'usecase-spec');
  if (!ids.length) return toast('Chưa chọn đặc tả use case nào', { error: true });
  const items = ids.map((id) => {
    const spec = readSpec(doc, id);
    return { spec, ctx: specContext(doc, spec) };
  });
  items.sort((a, b) => a.ctx.code.localeCompare(b.ctx.code, 'vi', { numeric: true }));
  const bytes = await specsDocx(items);
  const one = items.length === 1 ? items[0].ctx : null;
  const path = await umlab.files.save({
    defaultName: one ? `dac-ta-${slug(one.code + ' ' + one.name)}.docx` : `dac-ta-use-case-${items.length}.docx`,
    filters: [{ name: 'Word', extensions: ['docx'] }],
    data: bytes,
  });
  if (path) toast(`Đã xuất ${items.length} đặc tả → ${fileName(path)}`);
}

export async function exportSpecMarkdown(doc: Y.Doc, diagramId: string): Promise<void> {
  const spec = readSpec(doc, diagramId);
  const ctx = specContext(doc, spec);
  const path = await umlab.files.save({
    defaultName: `dac-ta-${slug(ctx.code + ' ' + ctx.name)}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    data: specToMarkdown(spec, ctx),
  });
  if (path) toast('Đã lưu ' + fileName(path));
}
