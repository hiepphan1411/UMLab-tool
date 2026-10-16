# CLAUDE.md — Quy ước dự án UMLab

## Bối cảnh

- UMLab: **ứng dụng desktop (.exe, Electron)** vẽ sơ đồ UML/kiến trúc/ERD/Gantt theo project, **cộng tác thời gian thực không cần server riêng**: mỗi máy kết nối thẳng MongoDB (Atlas), dữ liệu project là tài liệu CRDT (Yjs) đồng bộ qua change stream.
- Kế hoạch gốc ở `docs/README.md`, từng phase ở `docs/phases/`, đặc tả ký hiệu ở `docs/spec/`. Kế hoạch gốc viết cho web + NestJS + Postgres; **ánh xạ sang kiến trúc desktop ở `docs/ARCHITECTURE.md`** — đọc file này trước khi làm phase bất kỳ.
- Tool cũ: `docs/reference/diagram-studio/` (clone từ `unipark-plus-web/tools/diagram-studio`: `index.html` + add-on `autosave.js`, `extras.js`, `smart-edges.js`). Dùng làm nguồn cho style, engine kéo thả, routing đường nối, xuất ảnh, Gantt. **Port logic, không chép nguyên file.**

## Lệnh (npm workspaces — không dùng pnpm)

- `npm i` · `npm run dev` (mở app Electron ở chế độ dev)
- `npm test` · `npm run lint` · `npm run typecheck` · `npm run check` (cả ba)
- Đóng gói Windows: `npm run dist` → `apps/desktop/release/UMLab-Setup-<ver>.exe` (+ bản portable)
- Icon UML: `npm run icons` (sinh lại `packages/uml-icons/src/index.ts`)
- E2E: `npm run e2e -w @umlab/desktop` (Playwright điều khiển Electron; cần `UMLAB_E2E_MONGO_URI` hoặc mongodb-memory-server)
- Cấu hình DB: `.env` ở gốc repo (`UMLAB_MONGO_URI`, `UMLAB_DB`) được nhúng vào bản build; người dùng đổi được trong app (Cài đặt → Kết nối).

## Kiến trúc & phụ thuộc

- `packages/core`: TypeScript thuần, **không import React/Electron/MongoDB**. Types, zod schema JSON, migrate legacy, generators, ORM mapper, DDL, mô hình dữ liệu project (Yjs). Mọi logic chuyển đổi đặt ở đây và có unit test.
- `apps/desktop/src/main`: main process — kết nối MongoDB, auth, project/thành viên, đồng bộ (change stream + hàng đợi offline), presence, hộp thoại tệp. Module theo domain, mỗi module một file `*.service.ts`; `ipc.ts` chỉ nối kênh IPC → service.
- `apps/desktop/src/preload`: `contextBridge` lộ `window.umlab` (kiểu `UmlabApi` trong `src/shared/api.ts`). Renderer **không** truy cập DB hay Node.
- `apps/desktop/src/renderer/src/features/editors/engine`: engine canvas dùng chung. Editor từng loại sơ đồ chỉ **đăng ký shape/connector/palette/inspector**, không sửa engine để phục vụ riêng một loại (nếu cần, mở rộng API engine).
- Dữ liệu project = một `Y.Doc` (xem `packages/core/src/project/ydoc.ts`): `folders`, `diagrams` (meta), `views:<id>`, `conns:<id>`, `data:<id>`, `model`, `meta`. Mọi ghi đi qua helper trong core để giữ đúng cấu trúc; undo/redo bằng `Y.UndoManager` (chỉ hoàn tác thao tác của chính mình).
- Schema JSON dùng chung: zod trong `packages/core`, validate khi nhập/xuất.

## Quy ước code

- TypeScript strict. Không `any` (dùng `unknown` + zod parse).
- Tên file kebab-case; component PascalCase; hook `useXxx`.
- Text giao diện **tiếng Việt**, gom ở `apps/desktop/src/renderer/src/i18n/vi.ts`. Thuật ngữ UML giữ tiếng Anh khi là tên ký hiệu (Lifeline, Fork Node).
- Màu chỉ dùng token CSS (`--bg`, `--panel`, `--text`, `--muted`, `--line`, `--accent`…), định nghĩa ở `apps/desktop/src/renderer/src/styles/tokens.css` cho 3 trạng thái: mặc định sáng, `prefers-color-scheme: dark`, `[data-theme]`. Style control (.btn, .ibtn, .field, .seg, .modal…) giữ đúng tool cũ.
- Font UI: Be Vietnam Pro. Font trong sơ đồ và ảnh xuất: Roboto (nhúng base64 khi xuất SVG).
- Icon UI: `lucide-react`. Icon palette UML: `packages/uml-icons` (SVG 16×16 tự vẽ). **Không dùng icon/ảnh của Visual Paradigm.**
- Ảnh xuất luôn nền sáng (không theo theme).

## Bảo mật

- Mật khẩu hash argon2id (hash-wasm, chạy ở main process). Phiên đăng nhập lưu cục bộ, mã hoá bằng `safeStorage`; thu hồi bằng `User.tokenVersion` (đổi mật khẩu / đăng xuất mọi nơi → mọi máy khác bị đăng xuất).
- Không có server nên chuỗi kết nối MongoDB nằm trong app: **dùng user Atlas riêng chỉ có quyền trên database `umlab`**, không dùng chung tài khoản của hệ thống khác cho bản phát hành.
- Mọi thao tác project ở main process kiểm tra thành viên + vai trò (owner/editor/viewer) trước khi đọc/ghi.
- Validate mọi JSON nhập bằng zod; giới hạn tệp nhập 10 MB.

## Kiểm thử bắt buộc

- `packages/core`: unit test cho mọi generator, mapper, migrate (dùng fixture UniPark+ ở `docs/reference/unipark-plus.json`).
- Engine: test thuần cho routing, hit-test, history.
- Main process: test service với mongodb-memory-server (replica set) khi có thể.
- Mỗi phase có ít nhất 1 Playwright (Electron) test cho luồng chính của phase đó.

## Định nghĩa "xong" một phase

1. Đủ mục trong "Việc cần làm" của phase (theo ánh xạ trong `docs/ARCHITECTURE.md`).
2. Pass mọi "Tiêu chí nghiệm thu".
3. `npm run check` sạch.
4. Cập nhật `docs/CHANGELOG.md` (một mục cho phase).
5. Commit `feat(P0x): …` — **không** thêm trailer Co-Authored-By/Claude.
