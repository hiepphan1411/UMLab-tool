// Xuất SQL DDL (docs/spec/notation-erd.md mục 4): chọn dialect, cảnh báo kiểm tra, xem trước có tô màu cú pháp,
// Sao chép, Tải `.sql`.
import { Copy, Download } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  DIALECTS,
  SQL_KEYWORDS,
  erdToDdl,
  schemaFromModel,
  validateErd,
  type Dialect,
  type ModelElement,
} from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { Button, Dialog, Segmented, openDialog, toast } from '@/ui';
import type { Engine } from '../engine/engine';
import { dialectOf } from './ops';

const EXTRA_KW =
  'alter add as by constraint create cycle default delimiter end exec execute foreign function go identity if in increment index is key language maxvalue minvalue no not null of on or primary procedure references replace returns sequence start table trigger type unique view with begin each row before after instead enum generated always comment set cascade restrict action'.split(
    ' ',
  );
const KW = new Set([...SQL_KEYWORDS.postgresql, ...SQL_KEYWORDS.mysql, ...SQL_KEYWORDS.sqlserver, ...EXTRA_KW]);
const TYPES =
  /^(bigint|integer|int|smallint|tinyint|serial|bigserial|numeric|decimal|double|precision|real|float|boolean|bit|varchar|nvarchar|char|nchar|text|date|time|timestamp|timestamptz|datetime|datetime2|uuid|uniqueidentifier|jsonb?|bytea|blob|varbinary|max)$/i;

/** Tô màu SQL đơn giản: chú thích, chuỗi, số, từ khoá, kiểu. */
export function highlightSql(sql: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w$]*)|(\s+|[^\s\w'-]+|-)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(sql))) {
    const [t] = m;
    if (m[1])
      out.push(
        <span key={i++} className="sql-cmt">
          {t}
        </span>,
      );
    else if (m[2])
      out.push(
        <span key={i++} className="sql-str">
          {t}
        </span>,
      );
    else if (m[3])
      out.push(
        <span key={i++} className="sql-num">
          {t}
        </span>,
      );
    else if (m[4] && TYPES.test(t))
      out.push(
        <span key={i++} className="sql-num">
          {t}
        </span>,
      );
    else if (m[4] && KW.has(t.toLowerCase()) && t === t.toUpperCase())
      out.push(
        <span key={i++} className="sql-kw">
          {t}
        </span>,
      );
    else out.push(t);
  }
  return out;
}

/** Schema của sơ đồ đang mở (phần tử có hình / đường nối). */
export function engineSchema(e: Engine) {
  const ids = [...e.lookup.views().map((v) => v.modelId), ...e.lookup.conns().map((c) => c.modelId)];
  return schemaFromModel(ids.map((id) => (id ? e.lookup.model(id) : undefined)).filter((m): m is ModelElement => !!m));
}

function DdlDialog({ e, name, done }: { e: Engine; name: string; done: () => void }) {
  const [dialect, setDialect] = useState<Dialect>(dialectOf(e.lookup));
  const schema = useMemo(() => engineSchema(e), [e]);
  const sql = useMemo(() => erdToDdl(schema, dialect), [schema, dialect]);
  const issues = useMemo(() => validateErd(schema, dialect).filter((i) => i.level !== 'info'), [schema, dialect]);
  const html = useMemo(() => highlightSql(sql), [sql]);
  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    toast('Đã sao chép SQL');
  };
  const save = async () => {
    const path = await umlab.files.save({
      defaultName: `${slug(name) || 'erd'}-${dialect}.sql`,
      filters: [{ name: 'SQL', extensions: ['sql'] }],
      data: sql,
    });
    if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
  };
  return (
    <Dialog
      open
      onClose={done}
      title="Xuất SQL DDL"
      width={820}
      footer={
        <>
          <Button variant="outline" onClick={done}>
            Đóng
          </Button>
          <Button variant="outline" icon={<Copy />} onClick={() => void copy()}>
            Sao chép
          </Button>
          <Button variant="primary" icon={<Download />} onClick={() => void save()}>
            Tải .sql
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="lbl" style={{ margin: 0 }}>
            Dialect
          </span>
          <Segmented
            ariaLabel="Dialect"
            value={dialect}
            onChange={setDialect}
            options={DIALECTS.map((d) => ({ value: d.id, label: d.label }))}
          />
          <span className="text-[12px] text-muted">
            {schema.entities.length} bảng · {schema.relationships.filter((r) => r.kind !== 'relnn').length} quan hệ
          </span>
        </div>
        {issues.length > 0 && (
          <ul className="grid gap-1 text-[12px]" aria-label="Cảnh báo DDL" style={{ maxHeight: 96, overflow: 'auto' }}>
            {issues.map((i, k) => (
              <li key={k} style={{ color: i.level === 'error' ? 'var(--danger)' : 'var(--warn)' }}>
                {i.level === 'error' ? 'Lỗi' : 'Cảnh báo'}: {i.message}
              </li>
            ))}
          </ul>
        )}
        <pre className="sql-pre" data-testid="ddl-preview" aria-label="SQL DDL">
          {html}
        </pre>
      </div>
    </Dialog>
  );
}

export function openDdlDialog(e: Engine, name: string) {
  void openDialog<null>((done) => <DdlDialog e={e} name={name} done={() => done(null)} />);
}
