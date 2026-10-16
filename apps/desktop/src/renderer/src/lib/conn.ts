import { create } from 'zustand';
import type { ConnStatus } from '@shared/api';
import { umlab } from './api';

interface ConnState {
  status: ConnStatus;
  init(): () => void;
}

export const useConn = create<ConnState>((set) => ({
  status: { state: 'connecting', realtime: false, dbName: '', host: '', pending: 0 },
  init() {
    if (!umlab) return () => {};
    void umlab.conn.status().then((status) => set({ status }));
    return umlab.conn.onStatus((status) => set({ status }));
  },
}));
