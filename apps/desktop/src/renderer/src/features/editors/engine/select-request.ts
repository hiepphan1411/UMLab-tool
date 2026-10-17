// Mở một sơ đồ rồi chọn sẵn hình / đường nối (Model Explorer “Xuất hiện ở các sơ đồ”, tìm kiếm Ctrl+K).
import { create } from 'zustand';

export interface SelectRequest {
  diagramId: string;
  viewIds: string[];
  connIds: string[];
}

export const useSelectRequest = create<{ req: SelectRequest | null; set: (r: SelectRequest | null) => void }>(
  (set) => ({
    req: null,
    set: (req) => set({ req }),
  }),
);

/** Lấy (và xoá) yêu cầu chọn cho sơ đồ `diagramId`. */
export function takeSelectRequest(diagramId: string): SelectRequest | null {
  const r = useSelectRequest.getState().req;
  if (!r || r.diagramId !== diagramId) return null;
  useSelectRequest.getState().set(null);
  return r;
}
