// Dán bảng tiến độ từ Excel / Google Sheets (port openPasteExcel của tool cũ).
import { useMemo, useState } from 'react';
import { ddm, dn, parseTSV, rowsToTasks, type GanttTask } from '@umlab/core';
import { Button, Dialog, Segmented, openDialog } from '@/ui';

export interface PasteResult {
  tasks: GanttTask[];
  mode: 'replace' | 'append';
}

export function pasteExcelDialog(): Promise<PasteResult | null> {
  return openDialog<PasteResult>((done) => <PasteView done={done} />);
}

function PasteView({ done }: { done: (v: PasteResult | null) => void }) {
  const [text, setText] = useState('');
  const [fmt, setFmt] = useState<'mdy' | 'dmy'>('mdy');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const tasks = useMemo(() => rowsToTasks(parseTSV(text), fmt), [text, fmt]);
  const [err, setErr] = useState('');
  return (
    <Dialog
      open
      onClose={() => done(null)}
      title="Dán bảng tiến độ từ Excel / Google Sheets"
      width={760}
      footer={
        <>
          <Button variant="outline" onClick={() => done(null)}>
            Huỷ
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              tasks.length ? done({ tasks, mode }) : setErr('Chưa nhận được dòng nào, kiểm tra lại dữ liệu dán')
            }
          >
            Nhập vào Gantt
          </Button>
        </>
      }
    >
      <p className="mb-3 text-muted" style={{ lineHeight: 1.55 }}>
        Chọn vùng bảng trong Excel (kèm dòng tiêu đề) rồi dán vào đây. Cột được nhận theo tên: Sprint, Tên giai đoạn,
        Ngày bắt đầu, Ngày kết thúc, Mục tiêu, Deliverables, Người phụ trách, Jira, Tiến độ.
      </p>
      <textarea
        className="field"
        data-autofocus
        aria-label="Bảng dán từ Excel"
        style={{
          height: '34vh',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: 12,
          whiteSpace: 'pre',
        }}
        placeholder={'Sprint\tTên giai đoạn\tNgày bắt đầu\tNgày kết thúc\t…'}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setErr('');
        }}
      />
      <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <span className="lbl">Định dạng ngày</span>
          <Segmented
            value={fmt}
            onChange={setFmt}
            options={[
              { value: 'mdy', label: 'Tháng/Ngày/Năm' },
              { value: 'dmy', label: 'Ngày/Tháng/Năm' },
            ]}
          />
        </div>
        <div>
          <span className="lbl">Cách nhập</span>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'replace', label: 'Thay thế' },
              { value: 'append', label: 'Thêm vào cuối' },
            ]}
          />
        </div>
      </div>
      <p className="mt-3 text-[12px]" style={{ color: err ? 'var(--danger)' : 'var(--muted)' }} data-paste-preview>
        {err ||
          (tasks.length
            ? `Nhận được ${tasks.length} dòng: ${tasks
                .slice(0, 3)
                .map((t) => `${t.code || t.name} (${ddm(dn(t.start))}–${ddm(dn(t.end))}, ${t.progress}%)`)
                .join(' · ')}${tasks.length > 3 ? ' …' : ''}`
            : '')}
      </p>
    </Dialog>
  );
}
