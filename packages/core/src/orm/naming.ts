// Quy tắc đặt tên bảng / cột khi parse ORM: `PhienGuiXe` → `phien_gui_xe`, số nhiều `vehicles`, camelCase.

/** Bỏ dấu tiếng Việt (tên SQL chỉ dùng ASCII). */
export const stripAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');

export function snakeCase(s: string): string {
  return stripAccents(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function camelCase(s: string): string {
  const parts = snakeCase(s).split('_').filter(Boolean);
  return parts.map((p, i) => (i ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join('');
}

/** Số nhiều tiếng Anh đơn giản cho từ cuối: vehicle → vehicles, category → categories, box → boxes. */
export function plural(s: string): string {
  const m = s.match(/^(.*?)([A-Za-z]+)$/);
  if (!m) return s;
  const [, head, w] = m;
  const lw = w.toLowerCase();
  if (/(s|x|z|ch|sh)$/.test(lw)) return head + w + 'es';
  if (/[^aeiou]y$/.test(lw)) return head + w.slice(0, -1) + 'ies';
  return head + w + 's';
}

export type TableNaming = 'snake' | 'keep' | 'plural';
export type ColumnNaming = 'snake' | 'camel';

export const tableName = (cls: string, rule: TableNaming) =>
  rule === 'keep'
    ? stripAccents(cls).replace(/[^\w]/g, '_')
    : rule === 'plural'
      ? plural(snakeCase(cls))
      : snakeCase(cls);

export const columnName = (attr: string, rule: ColumnNaming) => (rule === 'camel' ? camelCase(attr) : snakeCase(attr));
