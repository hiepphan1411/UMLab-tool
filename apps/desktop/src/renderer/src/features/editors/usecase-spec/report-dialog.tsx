// "Xuất mẫu Doc": xem trước bảng đặc tả theo mẫu báo cáo, Sao chép (dán thẳng vào Word giữ định dạng) hoặc Tải .docx.
import { Copy, Download } from 'lucide-react';
import { useMemo } from 'react';
import type * as Y from 'yjs';
import { readSpec, specContext, specReportDocx, specReportHtml, specReportText } from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { Button, Dialog, openDialog, toast } from '@/ui';

function ReportDialog({ doc, diagramId, done }: { doc: Y.Doc; diagramId: string; done: () => void }) {
  const { spec, ctx, html } = useMemo(() => {
    const spec = readSpec(doc, diagramId);
    const ctx = specContext(doc, spec);
    return { spec, ctx, html: specReportHtml(spec, ctx) };
  }, [doc, diagramId]);
  const copy = async () => {
    try {
      // Word nhận text/html: giữ bảng, viền, font; nơi khác nhận văn bản thuần
      const page = `<html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([page], { type: 'text/html' }),
          'text/plain': new Blob([specReportText(spec, ctx)], { type: 'text/plain' }),
        }),
      ]);
      toast('Đã sao chép — dán (Ctrl+V) vào Word để giữ nguyên bảng');
    } catch {
      toast('Không sao chép được vào clipboard', { error: true });
    }
  };
  const save = async () => {
    const path = await umlab.files.save({
      defaultName: `dac-ta-${slug(ctx.code + ' ' + ctx.name)}.docx`,
      filters: [{ name: 'Word', extensions: ['docx'] }],
      data: await specReportDocx([{ spec, ctx }]),
    });
    if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
  };
  return (
    <Dialog
      open
      onClose={done}
      title="Xuất mẫu Doc"
      width={780}
      footer={
        <>
          <span className="mr-auto self-center text-[11.5px] text-muted">Times New Roman 13 · giãn dòng 1,5</span>
          <Button variant="outline" onClick={done}>
            Đóng
          </Button>
          <Button variant="outline" icon={<Copy />} onClick={() => void copy()}>
            Sao chép
          </Button>
          <Button variant="primary" icon={<Download />} onClick={() => void save()}>
            Tải .docx
          </Button>
        </>
      }
    >
      <div className="doc-preview">
        {/* HTML sinh từ core, mọi chuỗi người dùng đã được escape */}
        <div className="doc-paper" data-testid="spec-report" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </Dialog>
  );
}

export function openSpecReport(doc: Y.Doc, diagramId: string) {
  void openDialog<null>((done) => <ReportDialog doc={doc} diagramId={diagramId} done={() => done(null)} />);
}
