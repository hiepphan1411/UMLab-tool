# Changelog

Mỗi phase hoàn thành thêm một mục: `## P0x — tên phase (ngày)` + danh sách thay đổi chính.

## P01 — Đăng ký, đăng nhập (2026-10-16)

- Auth chạy ở main process (`src/main/auth.service.ts`): mật khẩu argon2id (hash-wasm, 19 MiB/2 vòng), luật ≥ 8 ký tự có chữ và số, email chuẩn hoá chữ thường + index unique.
- Phiên: “Ghi nhớ đăng nhập” lưu `{userId, tokenVersion}` mã hoá `safeStorage` ở `userData/session.bin`; bỏ chọn thì chỉ giữ trong bộ nhớ. Không lưu token trong DB.
- Thu hồi bằng `tokenVersion`: kiểm lại mỗi 60 giây + change stream trên tài liệu user → đổi mật khẩu/“Đăng xuất mọi thiết bị” ở máy khác làm máy này bị đăng xuất ngay (kèm thông báo lý do ở màn đăng nhập).
- Chống dò mật khẩu: 5 lần sai/phút/email → “Bạn thử quá nhiều lần, chờ 1 phút” (collection `login_attempts`, TTL).
- Màn `/login`, `/register` bố cục 2 cột (form + panel minh hoạ UML vẽ SVG), hiện/ẩn mật khẩu, thanh độ mạnh mật khẩu; `RequireAuth` chuyển `/login?next=…`.
- Menu tài khoản (avatar chữ cái đầu): Hồ sơ (tên, màu đại diện), Đổi mật khẩu, Giao diện, Kết nối cơ sở dữ liệu, Đăng xuất, Đăng xuất mọi thiết bị.
- Tài khoản demo `demo@umlab.local / Demo1234` khi chạy bản dev.
- Test: `services.test.ts` (đăng ký, trùng email, luật mật khẩu, khoá 1 phút, thu hồi qua change stream, đổi mật khẩu); Playwright `p01-auth.spec.ts` (đăng ký → đăng xuất → đăng nhập, mở lại app vẫn đăng nhập, chặn sau 5 lần sai).

## P00 — Khởi tạo dự án (2026-10-16)

- Chuyển kế hoạch sang **ứng dụng desktop Electron** + **MongoDB** + cộng tác realtime không cần server; ánh xạ chi tiết ở `docs/ARCHITECTURE.md`. Bộ tài liệu kế hoạch chuyển vào `docs/`; tool cũ clone vào `docs/reference/diagram-studio/`.
- Monorepo npm workspaces: `apps/desktop` (electron-vite: main / preload / renderer React 18 + Tailwind 4), `packages/core` (TS thuần + Vitest), `packages/uml-icons` (SVG 16×16 + script sinh `index.ts` + trang xem trước).
- Main process: kết nối MongoDB dùng chung (tự kết nối lại, dò change stream, tạo index), `ChangeFeed` (change stream có `startAtOperationTime`, tự chuyển sang hỏi vòng nếu DB không hỗ trợ), IPC có kiểu (`src/shared/api.ts`), preload `window.umlab` (contextIsolation + sandbox).
- Chuỗi kết nối lấy từ `unipark-plus-core` (database riêng `umlab`), nhúng vào bản build qua `.env`; đổi được trong app (Cài đặt → Kết nối, lưu mã hoá).
- Token màu + style control (.btn, .ibtn, .field, .seg, .modal, .tabs…) chép từ tool cũ cho 3 trạng thái theme; nút theme 3 chế độ (Hệ thống/Sáng/Tối) lưu lại; thanh trên 48px làm thanh tiêu đề cửa sổ (`titleBarOverlay`, đổi màu theo theme).
- Logo UMLab tự chọn bản sáng/tối, icon app `build/icon.png` sinh từ SVG.
- UI kit `src/renderer/src/ui`: Button, IconButton, Input, Textarea, Select, Segmented, Checkbox, ColorField, NumberField, Dialog, confirm/prompt/choice dialog (không dùng `window.confirm`), Toast, Tooltip, DropdownMenu, ContextMenu (có menu con), Tabs, Tree (chọn nhiều, bàn phím, kéo thả, đổi tên tại chỗ), Avatar, EmptyState. Trang `#/_ui` (chỉ bản dev).
- ESLint + Prettier + Husky/lint-staged; CI GitHub Actions (lint, typecheck, test trên Ubuntu; E2E + đóng gói `.exe` trên Windows); `electron-builder.yml` (NSIS + portable).
- Test: Playwright Electron `p00-shell.spec.ts` (mở app, kết nối realtime, theme giữ sau tải lại) với mongodb-memory-server (replica set).
