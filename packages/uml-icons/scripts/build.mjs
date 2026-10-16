// Sinh src/index.ts (tên icon → chuỗi SVG) từ thư mục icons/*.svg; --preview tạo thêm preview.html và mở nó.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'icons');
const files = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();

const icons = {};
for (const f of files) {
  const raw = readFileSync(join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
  if (!/viewBox="0 0 16 16"/.test(raw)) throw new Error(`${f}: icon phải có viewBox="0 0 16 16"`);
  icons[f.replace(/\.svg$/, '')] = raw;
}

const body = Object.entries(icons)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');
writeFileSync(
  join(root, 'src/index.ts'),
  `// Tệp sinh tự động bởi scripts/build.mjs — không sửa tay. Icon gốc ở icons/*.svg (16×16).\n` +
    `export const UML_ICONS: Record<string, string> = {\n${body}\n};\n\n` +
    `export type UmlIconName = keyof typeof UML_ICONS;\n\n` +
    `export function umlIcon(name: string): string {\n  return UML_ICONS[name] ?? UML_ICONS['missing'] ?? '';\n}\n`,
);
console.log(`uml-icons: ${files.length} icon → src/index.ts`);

if (process.argv.includes('--preview')) {
  const cells = Object.entries(icons)
    .map(([k, v]) => `<figure><div class="ic">${v.replace('<svg', '<svg width="32" height="32"')}</div><div class="ic sm">${v}</div><figcaption>${k}</figcaption></figure>`)
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><title>UMLab — UML icons</title>
<style>body{font:13px system-ui;margin:24px;background:#F5F6F8;color:#1B2130}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
figure{margin:0;background:#fff;border:1px solid #E2E5EA;border-radius:8px;padding:10px;display:grid;gap:6px;justify-items:center}
.ic{display:grid;place-items:center}.sm svg{width:16px;height:16px}figcaption{font-size:11px;color:#687085;text-align:center;word-break:break-all}
@media (prefers-color-scheme:dark){body{background:#15171C;color:#E5E8EF}figure{background:#1D2027;border-color:#313644}}</style>
<h1>UMLab — ${files.length} icon UML</h1><main>${cells}</main>`;
  const out = join(root, 'preview.html');
  writeFileSync(out, html);
  console.log('preview → ' + out);
  const opener = process.platform === 'win32' ? `start "" "${out}"` : process.platform === 'darwin' ? `open "${out}"` : `xdg-open "${out}"`;
  exec(opener);
}
