import { memo } from 'react';
import type { DiagramMeta } from '@umlab/core';
import { DIAGRAM_COLOR, DiagramIcon } from '@/lib/icons';
import { renderThumbnail } from '../editors/thumbnails';
import type { ProjectSession } from './session';

/** Ảnh thu nhỏ của sơ đồ (dựng SVG ngay từ nội dung, không lưu DB). */
export const DiagramThumbnail = memo(function DiagramThumbnail({
  session,
  diagram,
}: {
  session: ProjectSession;
  diagram: DiagramMeta;
  version: number;
}) {
  const svg = renderThumbnail(session.doc, diagram);
  if (svg)
    return (
      <div
        className="absolute inset-0 grid place-items-center p-2 [&>svg]:max-h-full [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ color: DIAGRAM_COLOR }}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'var(--accent-soft)' }}>
        <DiagramIcon type={diagram.type} size={28} colored />
      </span>
    </div>
  );
});
