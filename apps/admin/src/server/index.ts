// npm run admin (dev): trang quản trị ở http://127.0.0.1:5176, giao diện tự nạp lại khi sửa code.
import { loadConfig, loadDotEnv } from './config';
import { start } from './server';

loadDotEnv();
const prod = process.env.UMLAB_ADMIN_PROD === '1';
const cfg = loadConfig();
const s = await start(cfg, { prod });
console.log(`UMLab quản trị: ${s.url}`);
if (!cfg.adminEmails.length && !cfg.adminPassword)
  console.warn('⚠ Chưa cấu hình tài khoản quản trị: đặt UMLAB_ADMIN_EMAILS hoặc UMLAB_ADMIN_PASSWORD trong .env');
