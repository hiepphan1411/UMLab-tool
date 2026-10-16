const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(a);
  else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
  return a;
}

/** Id ngắn ngẫu nhiên có tiền tố: uid('v') → "v_k3j9x0a2q1". */
export function uid(prefix = 'id', len = 10): string {
  const b = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHA[b[i] % 36];
  return `${prefix}_${s}`;
}
