import { useEffect, useState } from 'react';
import type { AppInfo } from '@shared/api';
import { umlab } from './api';

let cached: AppInfo | null = null;

/** Thông tin app (phiên bản, bản dev…) — lấy một lần từ main process. */
export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(cached);
  useEffect(() => {
    if (cached || !umlab) return;
    void umlab.app.info().then((i) => {
      cached = i;
      setInfo(i);
    });
  }, []);
  return info;
}
