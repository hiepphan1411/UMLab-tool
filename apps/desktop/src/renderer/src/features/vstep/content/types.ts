// Kiểu dữ liệu tài liệu ôn thi (nội dung viết bằng cú pháp của rich.tsx).
export type DocId = 'listening' | 'reading' | 'writing' | 'speaking' | 'grammar' | 'vocab';

export interface DocSection {
  id: string;
  title: string;
  body: string;
}

export interface DocPart {
  id: string;
  title: string;
  sections: DocSection[];
}

export interface VDoc {
  id: DocId;
  title: string;
  subtitle: string;
  parts: DocPart[];
}

/** Bỏ thụt lề chung của template string. */
export function md(strings: TemplateStringsArray, ...vals: unknown[]): string {
  const s = String.raw({ raw: strings.raw }, ...vals);
  const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length));
  return lines.map((l) => l.slice(ind)).join('\n') + '\n';
}
