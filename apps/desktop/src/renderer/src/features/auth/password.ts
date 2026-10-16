/** Luật mật khẩu (trùng với main process): ≥ 8 ký tự, có chữ và số. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự';
  if (!/[A-Za-zÀ-ỹ]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu cần có cả chữ và số';
  return null;
}

/** 0–4: độ mạnh ước lượng cho thanh hiển thị. */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (passwordProblem(pw)) s = Math.min(s, 1);
  return Math.min(4, s);
}
