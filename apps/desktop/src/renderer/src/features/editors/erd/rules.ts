// Kiểm tra ERD (docs/spec/notation-erd.md mục 3) — dùng validateErd của core trên các phần tử có trên sơ đồ.
import { schemaFromModel, validateErd, type ModelElement } from '@umlab/core';
import type { Issue, Rule } from '../engine/registry';
import { dialectOf, ensurePk, makeJunction } from './ops';

export const ERD_RULES: Rule[] = [
  (r) => {
    const ids = [...r.views.map((v) => v.modelId), ...r.conns.map((c) => c.modelId)];
    const els = ids.map((id) => (id ? r.lookup.model(id) : undefined)).filter((m): m is ModelElement => !!m);
    const schema = schemaFromModel(els);
    const viewOf = (modelId: string) => r.views.find((v) => v.modelId === modelId)?.id;
    const connOf = (modelId: string) => r.conns.find((c) => c.modelId === modelId)?.id;
    return validateErd(schema, dialectOf(r.lookup)).map((i): Issue => {
      const issue: Issue = { level: i.level, message: i.message, targetId: viewOf(i.targetId) ?? connOf(i.targetId) };
      if (i.code === 'no-pk') issue.fix = { label: 'Thêm khoá chính id', run: (tx) => ensurePk(tx, i.targetId) };
      const conn = connOf(i.targetId);
      if (i.code === 'nn' && conn)
        issue.fix = { label: 'Tạo bảng trung gian', run: (tx) => makeJunction((fn) => fn(tx), conn) };
      return issue;
    });
  },
];
