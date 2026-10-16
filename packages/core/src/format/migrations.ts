// Chuỗi migrate theo schemaVersion (docs/spec/json-format.md mục 3). Hiện mới có phiên bản 1.
export const SCHEMA_VERSION = 1;

type Migration = (f: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] nâng tệp từ phiên bản n lên n+1. */
const MIGRATIONS: Record<number, Migration> = {};

export function migrateFile(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  let f = raw as Record<string, unknown>;
  let v = typeof f.schemaVersion === 'number' ? f.schemaVersion : 1;
  if (v > SCHEMA_VERSION)
    throw new Error(`Tệp được tạo bởi UMLab mới hơn (schemaVersion ${v}). Hãy cập nhật ứng dụng.`);
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) break;
    f = m(f);
    v++;
    f.schemaVersion = v;
  }
  return f;
}
