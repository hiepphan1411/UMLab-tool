// Kiểm tra đặc tả + xuất Markdown (docs/spec/usecase-spec-template.md mục 2–3).
import type { Flow, Step, UseCaseSpec } from './model';

/** Thông tin ngoài đặc tả cần để hiển thị: mã/tên use case, tên actor, tên use case khác. */
export interface SpecContext {
  code: string;
  name: string;
  actorName: (id: string) => string;
  useCaseLabel: (id: string) => string;
}

export interface SpecIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  section: 'general' | 'actors' | 'mainFlow' | 'alternativeFlows' | 'exceptionFlows';
  stepId?: string;
  flowId?: string;
}

export function validateSpec(spec: UseCaseSpec, o: { hasUseCase: boolean }): SpecIssue[] {
  const out: SpecIssue[] = [];
  const n = spec.mainFlow.length;
  if (!o.hasUseCase) out.push({ level: 'error', message: 'Đặc tả chưa gắn với use case nào', section: 'general' });
  if (!spec.primaryActors.length)
    out.push({ level: 'warning', message: 'Use case chưa có tác nhân chính', section: 'actors' });
  if (!n) out.push({ level: 'warning', message: 'Luồng sự kiện chính chưa có bước nào', section: 'mainFlow' });
  spec.mainFlow.forEach((s) => {
    if (!s.text.trim())
      out.push({
        level: 'warning',
        message: `Bước ${s.no} của luồng chính đang rỗng`,
        section: 'mainFlow',
        stepId: s.id,
      });
  });
  const flows: [Flow[], 'alternativeFlows' | 'exceptionFlows'][] = [
    [spec.alternativeFlows, 'alternativeFlows'],
    [spec.exceptionFlows, 'exceptionFlows'],
  ];
  for (const [list, section] of flows)
    for (const f of list) {
      if (f.branchAt < 1 || f.branchAt > n)
        out.push({
          level: 'error',
          message: `${f.code} rẽ từ bước ${f.branchAt} không tồn tại`,
          section,
          flowId: f.id,
        });
      if (f.end.kind === 'returnTo' && (f.end.stepNo < 1 || f.end.stepNo > n))
        out.push({
          level: 'error',
          message: `${f.code} quay lại bước ${f.end.stepNo} không tồn tại`,
          section,
          flowId: f.id,
        });
      if (!f.steps.length) out.push({ level: 'warning', message: `${f.code} chưa có bước nào`, section, flowId: f.id });
      f.steps.forEach((s) => {
        if (!s.text.trim())
          out.push({
            level: 'warning',
            message: `Bước ${f.code}.${s.no} đang rỗng`,
            section,
            flowId: f.id,
            stepId: s.id,
          });
      });
    }
  return out;
}

export const performerName = (s: Step, ctx: SpecContext) =>
  s.performer.kind === 'system' ? 'Hệ thống' : ctx.actorName(s.performer.actorId);

export function flowEndText(f: Flow): string {
  if (f.end.kind === 'returnTo') return `Quay lại bước ${f.end.stepNo}`;
  return f.end.kind === 'endSuccess' ? 'Kết thúc thành công' : 'Kết thúc thất bại';
}

/** Nội dung một bước (kèm ghi chú lặp / gọi use case khác). */
export function stepText(s: Step, ctx: SpecContext): string {
  let t = s.text;
  if (s.includeUseCaseId) t += ` (thực hiện ${ctx.useCaseLabel(s.includeUseCaseId)})`;
  if (s.loop) t += ` (lặp lại cho đến khi ${s.loop.until})`;
  return t;
}

const list = (xs: string[]) => xs.map((x, i) => `${i + 1}. ${x}`).join('\n');
const mdCell = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

function mdSteps(steps: Step[], ctx: SpecContext, prefix = ''): string {
  return [
    '| STT | Thực hiện bởi | Hành động |',
    '| --- | --- | --- |',
    ...steps.map((s) => `| ${prefix}${s.no} | ${mdCell(performerName(s, ctx))} | ${mdCell(stepText(s, ctx))} |`),
  ].join('\n');
}

export function specToMarkdown(spec: UseCaseSpec, ctx: SpecContext): string {
  const actors = (ids: string[]) => ids.map(ctx.actorName).join(', ') || '—';
  const flows = (fs: Flow[]) =>
    fs
      .map(
        (f) =>
          `#### ${f.code} – ${f.name} (tại bước ${f.branchAt})\n\n` +
          (f.condition ? `Điều kiện: ${f.condition}\n\n` : '') +
          mdSteps(f.steps, ctx, f.code + '.') +
          `\n\n_${flowEndText(f)}_`,
      )
      .join('\n\n');
  const coded = (xs: { code: string; text: string }[]) => xs.map((x) => `- **${x.code}**: ${x.text}`).join('\n');
  const parts: string[] = [
    `## ${ctx.code} – ${ctx.name}`,
    '',
    '| Mục | Nội dung |',
    '| --- | --- |',
    `| Mã use case | ${ctx.code} |`,
    `| Tên use case | ${mdCell(ctx.name)} |`,
    `| Tác nhân chính | ${mdCell(actors(spec.primaryActors))} |`,
    `| Tác nhân phụ | ${mdCell(actors(spec.secondaryActors))} |`,
    `| Mô tả | ${mdCell(spec.description || '—')} |`,
    `| Mức độ ưu tiên | ${spec.priority} |`,
    `| Sự kiện kích hoạt | ${mdCell(spec.trigger || '—')} |`,
    `| Tiền điều kiện | ${mdCell(list(spec.preconditions) || '—')} |`,
    `| Hậu điều kiện | ${mdCell(`Thành công: ${spec.postconditions.success.join('; ') || '—'} · Thất bại: ${spec.postconditions.failure.join('; ') || '—'}`)} |`,
  ];
  if (spec.includes.length) parts.push(`| Include | ${mdCell(spec.includes.map(ctx.useCaseLabel).join(', '))} |`);
  if (spec.extends.length) parts.push(`| Extend | ${mdCell(spec.extends.map(ctx.useCaseLabel).join(', '))} |`);
  if (spec.frequency) parts.push(`| Tần suất | ${mdCell(spec.frequency)} |`);
  parts.push('', '### Luồng sự kiện chính', '', mdSteps(spec.mainFlow, ctx));
  if (spec.alternativeFlows.length) parts.push('', '### Luồng thay thế', '', flows(spec.alternativeFlows));
  if (spec.exceptionFlows.length) parts.push('', '### Luồng ngoại lệ', '', flows(spec.exceptionFlows));
  if (spec.businessRules.length) parts.push('', '### Quy tắc nghiệp vụ', '', coded(spec.businessRules));
  if (spec.nonFunctional.length) parts.push('', '### Yêu cầu phi chức năng', '', coded(spec.nonFunctional));
  if (spec.screens.length) parts.push('', `**Màn hình:** ${spec.screens.map((x) => x.name).join(', ')}`);
  if (spec.entities.length) parts.push('', `**Dữ liệu:** ${spec.entities.map((x) => x.name).join(', ')}`);
  if (spec.notes) parts.push('', `**Ghi chú:** ${spec.notes}`);
  return parts.join('\n') + '\n';
}
