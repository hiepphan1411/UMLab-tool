#!/usr/bin/env node
// Đặt lại mật khẩu một tài khoản UMLab (không có máy chủ gửi email — docs/ARCHITECTURE.md, P13).
// Dùng cho chủ project / quản trị có chuỗi kết nối MongoDB:
//   npm run reset-password -- <email> [mật-khẩu-mới]
// Không nhập mật khẩu mới → sinh mật khẩu tạm và in ra. Đồng thời tăng tokenVersion (đăng xuất mọi máy của tài khoản)
// và xoá bộ đếm đăng nhập sai. Chuỗi kết nối lấy từ biến môi trường UMLAB_MONGO_URI / UMLAB_DB hoặc tệp .env ở gốc repo.
import { randomBytes, randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argon2id } from 'hash-wasm';
import { MongoClient } from 'mongodb';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const f = join(root, '.env');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

/** Trùng luật mật khẩu của app: ≥ 8 ký tự, có chữ và số. */
export function passwordProblem(pw) {
  if (pw.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự';
  if (!/[A-Za-zÀ-ỹ]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu cần có cả chữ và số';
  return null;
}

export function tempPassword() {
  const letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (s) => s[randomInt(s.length)];
  const chars = [pick(letters), pick(digits), ...Array.from({ length: 10 }, () => pick(all))];
  return chars.sort(() => randomInt(3) - 1).join('');
}

/** Cùng tham số argon2id với main process (auth.service.ts). */
export const hashPassword = (password) =>
  argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });

/** Đặt lại mật khẩu trên database `db` (đã kết nối). Trả về false nếu không có tài khoản. */
export async function resetPassword(db, email, password) {
  const e = String(email).trim().toLowerCase();
  const res = await db
    .collection('users')
    .updateOne({ email: e }, { $set: { passwordHash: await hashPassword(password) }, $inc: { tokenVersion: 1 } });
  if (!res.matchedCount) return false;
  await db.collection('login_attempts').deleteOne({ _id: e });
  return true;
}

async function main() {
  const [email, given] = process.argv.slice(2);
  if (!email || email === '-h' || email === '--help') {
    console.log('Cách dùng: npm run reset-password -- <email> [mật-khẩu-mới]');
    process.exit(email ? 0 : 1);
  }
  loadEnv();
  const uri = process.env.UMLAB_MONGO_URI;
  if (!uri) {
    console.error('Thiếu UMLAB_MONGO_URI (đặt biến môi trường hoặc tệp .env ở gốc repo).');
    process.exit(1);
  }
  const password = given ?? tempPassword();
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    await client.connect();
    const ok = await resetPassword(client.db(process.env.UMLAB_DB || 'umlab'), email, password);
    if (!ok) {
      console.error(`Không có tài khoản ${email}.`);
      process.exitCode = 1;
      return;
    }
    console.log(`Đã đặt lại mật khẩu cho ${email}; mọi phiên đăng nhập cũ đã bị thu hồi.`);
    if (!given) console.log(`Mật khẩu tạm: ${password}  (nhắc người dùng đổi trong app: Tài khoản → Đổi mật khẩu)`);
  } finally {
    await client.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
