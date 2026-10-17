// Dialect SQL: danh sách kiểu theo dialect, ánh xạ kiểu UML → SQL (docs/spec/orm-mapping.md mục 2),
// từ khoá, trích dẫn tên, chuỗi kiểu của cột.
import type { Dialect, ErdColumn } from './model';

export const DIALECTS: { id: Dialect; label: string }[] = [
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'sqlserver', label: 'SQL Server' },
];
export const dialectLabel = (d: Dialect) => DIALECTS.find((x) => x.id === d)?.label ?? d;

/** Kiểu cột hay dùng theo dialect (ô chọn kiểu trong Inspector). */
export const DIALECT_TYPES: Record<Dialect, string[]> = {
  postgresql: [
    'BIGINT',
    'INTEGER',
    'SMALLINT',
    'SERIAL',
    'BIGSERIAL',
    'NUMERIC',
    'DOUBLE PRECISION',
    'REAL',
    'BOOLEAN',
    'VARCHAR',
    'CHAR',
    'TEXT',
    'DATE',
    'TIME',
    'TIMESTAMP',
    'TIMESTAMPTZ',
    'INTERVAL',
    'UUID',
    'JSON',
    'JSONB',
    'BYTEA',
    'INET',
  ],
  mysql: [
    'BIGINT',
    'INT',
    'SMALLINT',
    'TINYINT',
    'DECIMAL',
    'DOUBLE',
    'FLOAT',
    'VARCHAR',
    'CHAR',
    'TEXT',
    'MEDIUMTEXT',
    'LONGTEXT',
    'DATE',
    'TIME',
    'DATETIME',
    'TIMESTAMP',
    'YEAR',
    'JSON',
    'BLOB',
    'ENUM',
  ],
  sqlserver: [
    'BIGINT',
    'INT',
    'SMALLINT',
    'TINYINT',
    'DECIMAL',
    'NUMERIC',
    'FLOAT',
    'REAL',
    'BIT',
    'NVARCHAR',
    'VARCHAR',
    'NCHAR',
    'CHAR',
    'DATE',
    'TIME',
    'DATETIME2',
    'DATETIMEOFFSET',
    'UNIQUEIDENTIFIER',
    'VARBINARY',
    'MONEY',
  ],
};

/** Kiểu nhận độ dài `(n)` / `(p,s)`. */
export const LENGTH_TYPES = new Set(['VARCHAR', 'CHAR', 'NVARCHAR', 'NCHAR', 'VARBINARY', 'BINARY', 'BIT VARYING']);
export const PRECISION_TYPES = new Set(['NUMERIC', 'DECIMAL', 'DATETIME', 'DATETIME2', 'TIME', 'TIMESTAMP', 'TINYINT']);

export interface SqlType {
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
}

type Row = [RegExp, Record<Dialect, SqlType>];
const t = (type: string, o: Omit<SqlType, 'type'> = {}): SqlType => ({ type, ...o });
const same = (x: SqlType): Record<Dialect, SqlType> => ({ postgresql: x, mysql: x, sqlserver: x });
const MAX = -1;

/** Bảng kiểu (spec mục 2). Độ dài -1 = MAX (SQL Server). */
const TYPE_TABLE: Row[] = [
  [
    /^(string|str|varchar|char\[\])$/,
    {
      postgresql: t('VARCHAR', { length: 255 }),
      mysql: t('VARCHAR', { length: 255 }),
      sqlserver: t('NVARCHAR', { length: 255 }),
    },
  ],
  [/^(text|clob|longtext)$/, { postgresql: t('TEXT'), mysql: t('TEXT'), sqlserver: t('NVARCHAR', { length: MAX }) }],
  [/^(char|character)$/, same(t('CHAR', { length: 1 }))],
  [
    /^(int|integer|number|int32|short|smallint|byte)$/,
    { postgresql: t('INTEGER'), mysql: t('INT'), sqlserver: t('INT') },
  ],
  [/^(long|int64|bigint|biginteger)$/, same(t('BIGINT'))],
  [
    /^(float|double|real|float64|float32)$/,
    { postgresql: t('DOUBLE PRECISION'), mysql: t('DOUBLE'), sqlserver: t('FLOAT') },
  ],
  [
    /^(decimal|bigdecimal|money|numeric)$/,
    {
      postgresql: t('NUMERIC', { precision: 19, scale: 4 }),
      mysql: t('DECIMAL', { precision: 19, scale: 4 }),
      sqlserver: t('DECIMAL', { precision: 19, scale: 4 }),
    },
  ],
  [/^(boolean|bool)$/, { postgresql: t('BOOLEAN'), mysql: t('TINYINT', { precision: 1 }), sqlserver: t('BIT') }],
  [/^(date|localdate)$/, same(t('DATE'))],
  [
    /^(datetime|localdatetime|instant|timestamp|zoneddatetime|offsetdatetime)$/,
    { postgresql: t('TIMESTAMPTZ'), mysql: t('DATETIME', { precision: 6 }), sqlserver: t('DATETIME2') },
  ],
  [/^(time|localtime)$/, same(t('TIME'))],
  [/^(uuid|guid)$/, { postgresql: t('UUID'), mysql: t('CHAR', { length: 36 }), sqlserver: t('UNIQUEIDENTIFIER') }],
  [
    /^(byte\[\]|blob|bytes|binary|buffer|uint8array)$/,
    { postgresql: t('BYTEA'), mysql: t('BLOB'), sqlserver: t('VARBINARY', { length: MAX }) },
  ],
  [
    /^(json|object|map|record|jsonnode)$/,
    { postgresql: t('JSONB'), mysql: t('JSON'), sqlserver: t('NVARCHAR', { length: MAX }) },
  ],
];

/** Kiểu UML/Java/TS → kiểu SQL theo dialect. null nếu không biết (người gọi giữ nguyên + cảnh báo). */
export function umlTypeToSql(umlType: string, dialect: Dialect, custom?: Record<string, string>): SqlType | null {
  const raw = umlType.trim().replace(/<.*>$/, '');
  const key = raw.toLowerCase();
  const own = custom && Object.entries(custom).find(([k]) => k.toLowerCase() === key)?.[1];
  if (own) return parseTypeText(own);
  for (const [re, by] of TYPE_TABLE) if (re.test(key)) return { ...by[dialect] };
  return null;
}

/** `VARCHAR(255)` → { type: VARCHAR, length: 255 }; `NUMERIC(19,4)` → precision/scale. */
export function parseTypeText(s: string): SqlType {
  const m = s.trim().match(/^([A-Za-z][\w ]*?)\s*(?:\(\s*(\w+)\s*(?:,\s*(\d+)\s*)?\))?$/);
  if (!m) return { type: s.trim().toUpperCase() };
  const type = m[1].toUpperCase();
  const a = m[2];
  const b = m[3];
  if (!a) return { type };
  const n = /^max$/i.test(a) ? MAX : Number(a);
  if (b !== undefined) return { type, precision: n, scale: Number(b) };
  return LENGTH_TYPES.has(type) ? { type, length: n } : { type, precision: n };
}

/** Chuỗi kiểu không gồm enum (để hiển thị và so sánh). */
export function typeText(c: Pick<ErdColumn, 'type' | 'length' | 'precision' | 'scale'>): string {
  const n = (v: number) => (v === MAX ? 'MAX' : String(v));
  if (c.length !== undefined && c.length !== null) return `${c.type}(${n(c.length)})`;
  if (c.precision !== undefined && c.precision !== null)
    return c.scale !== undefined && c.scale !== null
      ? `${c.type}(${c.precision},${c.scale})`
      : `${c.type}(${c.precision})`;
  return c.type;
}

/** Chuỗi kiểu của cột trong DDL theo dialect (enum: PostgreSQL dùng tên kiểu, MySQL ENUM(...), SQL Server VARCHAR). */
export function columnTypeSql(c: ErdColumn, dialect: Dialect): string {
  if (c.enumValues?.length) {
    if (dialect === 'postgresql') return quoteIdent(c.type, dialect);
    if (dialect === 'mysql') return `ENUM(${c.enumValues.map(sqlString).join(', ')})`;
    const len = Math.max(1, ...c.enumValues.map((v) => v.length));
    return `VARCHAR(${len})`;
  }
  return typeText(c);
}

export const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

const ALIASES: Record<string, string> = {
  INT: 'INTEGER',
  INT4: 'INTEGER',
  INT8: 'BIGINT',
  SERIAL: 'INTEGER',
  SERIAL4: 'INTEGER',
  BIGSERIAL: 'BIGINT',
  SERIAL8: 'BIGINT',
  BOOL: 'BOOLEAN',
  DECIMAL: 'NUMERIC',
  'CHARACTER VARYING': 'VARCHAR',
  FLOAT8: 'DOUBLE PRECISION',
  'TIMESTAMP WITH TIME ZONE': 'TIMESTAMPTZ',
};

/** Khoá so sánh kiểu (FK phải cùng kiểu cột được tham chiếu): bỏ khác biệt bí danh / hoa thường. */
export function typeKey(c: Pick<ErdColumn, 'type' | 'length' | 'precision' | 'scale' | 'enumValues'>): string {
  const base = c.type.trim().toUpperCase().replace(/\s+/g, ' ');
  return typeText({ ...c, type: ALIASES[base] ?? base });
}

// ---------------- từ khoá & trích dẫn tên ----------------

const COMMON =
  'all and any as asc between both by case cast check column constraint create cross current_date current_time current_timestamp current_user default delete desc distinct drop else end except exists false fetch for foreign from full grant group having in inner insert intersect into is join key left like limit not null of offset on or order outer primary references right select set some table then to true union unique update user using values view when where with';
const PG =
  'analyse analyze array asymmetric authorization binary collate collation concurrently current_catalog current_role deferrable do freeze ilike initially isnull lateral leading localtime localtimestamp natural notnull only overlaps placing returning session_user similar symmetric tablesample trailing variadic verbose window';
const MY =
  'add alter before bigint blob call cascade change char character condition continue convert cursor database databases decimal declare delayed describe div double each elseif enclosed escaped exit explain float force fulltext function groups if ignore index int integer interval keys kill leading leave lines load lock long loop match mod natural numeric option out partition precision procedure range rank read real regexp release rename repeat replace require restrict return revoke rlike row rows schema show smallint spatial sql ssl starting terminated trailing trigger unlock unsigned usage use varchar while write xor zerofill';
const MS =
  'add alter authorization backup begin break browse bulk cascade checkpoint close clustered coalesce collate commit compute contains containstable continue convert current cursor database dbcc deallocate declare deny disk distributed double dump errlvl escape exec execute exit external file fillfactor freetext freetexttable function goto holdlock identity identity_insert identitycol if index kill lineno load merge national nocheck nonclustered nullif off offsets open opendatasource openquery openrowset openxml option over percent pivot plan precision print proc procedure public raiserror read readtext reconfigure replication restore restrict return revert revoke rollback rowcount rowguidcol rule save schema securityaudit session_user setuser shutdown statistics system_user textsize top tran transaction trigger truncate try_convert tsequal unpivot updatetext use varying waitfor while writetext';

export const SQL_KEYWORDS: Record<Dialect, Set<string>> = {
  postgresql: new Set(`${COMMON} ${PG}`.split(' ')),
  mysql: new Set(`${COMMON} ${MY}`.split(' ')),
  sqlserver: new Set(`${COMMON} ${MS}`.split(' ')),
};

export const isKeyword = (name: string, dialect: Dialect) => SQL_KEYWORDS[dialect].has(name.trim().toLowerCase());

/** Tên cần trích dẫn: trùng từ khoá, có ký tự đặc biệt, (PostgreSQL) có chữ hoa — giữ đúng hoa thường. */
export function needsQuote(name: string, dialect: Dialect): boolean {
  if (isKeyword(name, dialect)) return true;
  if (dialect === 'postgresql') return !/^[a-z_][a-z0-9_$]*$/.test(name);
  return !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name);
}

export function quoteIdent(name: string, dialect: Dialect, force = false): string {
  if (!force && !needsQuote(name, dialect)) return name;
  if (dialect === 'mysql') return '`' + name.replace(/`/g, '``') + '`';
  if (dialect === 'sqlserver') return '[' + name.replace(/]/g, ']]') + ']';
  return '"' + name.replace(/"/g, '""') + '"';
}
