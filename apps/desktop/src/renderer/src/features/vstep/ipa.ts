// Phiên âm IPA tự sinh từ từ điển phát âm CMU (giọng Mỹ, ~126 nghìn từ) - tệp data/ipa-en.json, nạp khi cần.
import { useEffect, useState } from 'react';

let dict: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

export function loadIpa(): Promise<Record<string, string>> {
  if (dict) return Promise.resolve(dict);
  // import động → Vite tách thành chunk riêng, chạy được cả khi app mở bằng file:// (bản cài)
  // (?raw: TypeScript không phải suy kiểu cho 126 nghìn khoá)
  loading ??= import('./data/ipa-en.json?raw')
    .then((m) => (dict = JSON.parse(m.default) as Record<string, string>))
    .catch(() => (dict = {}));
  return loading;
}

/** IPA của một từ (null nếu không có trong từ điển). */
export function wordIpa(word: string): string | null {
  if (!dict) return null;
  const w = word
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z']+|[^a-z']+$/g, '');
  if (!w) return null;
  return dict[w] ?? (w.endsWith("'s") ? (dict[w.slice(0, -2)] ?? null) : null);
}

/** IPA cả câu: từng từ nối bằng dấu cách; từ không có trong từ điển giữ nguyên chữ. */
export function sentenceIpa(text: string): string {
  if (!dict) return '';
  return text
    .replace(/\[[^\]]*\]/g, ' … ')
    .split(/(\s+|[,.;:!?()"–-]+)/)
    .map((tok) => {
      if (!/[A-Za-z]/.test(tok)) return /[,.;:!?]/.test(tok) ? tok.trim() + ' ' : tok.trim() ? '' : ' ';
      return wordIpa(tok) ?? tok;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;:!?])/g, '$1')
    .trim();
}

/** Hook: true khi từ điển đã nạp xong. */
export function useIpaReady(enabled = true): boolean {
  const [ready, setReady] = useState(!!dict);
  useEffect(() => {
    if (!enabled || dict) return;
    let alive = true;
    void loadIpa().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return ready;
}
