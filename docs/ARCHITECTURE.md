# Kiến trúc UMLab desktop — ánh xạ từ kế hoạch web

Kế hoạch gốc (README, phases/) thiết kế UMLab là web app React + NestJS + PostgreSQL. Yêu cầu thực tế:

1. Chạy dưới dạng **ứng dụng desktop `.exe`**.
2. Nhiều người **kết nối và làm việc thời gian thực với nhau mà không cần server**.
3. Dữ liệu lưu trên **MongoDB** (cluster Atlas lấy từ `unipark-plus-core`, database riêng `umlab`).
4. Giao diện giữ style của tool cũ (`docs/reference/diagram-studio`).

## 1. Sơ đồ khối

```
┌──────────────── Máy A (UMLab.exe) ────────────────┐        ┌──────── MongoDB Atlas ────────┐
│ Renderer (React)                                  │        │ db: umlab                      │
│  ├─ Y.Doc của project ◄── apply update ──┐        │        │  users                         │
│  ├─ Engine canvas / editors              │        │        │  login_attempts (TTL)          │
│  └─ window.umlab (preload, IPC)          │        │        │  projects (members, stats)     │
│ Main process (Node)                      │        │  insert│  project_updates (Yjs, nén dần) │
│  ├─ auth.service  (argon2id, safeStorage)│        │ ──────►│  presence (TTL 60s)            │
│  ├─ projects.service (thành viên/quyền)  │        │◄────── │  diagram_versions, assets      │
│  ├─ sync.service  (hàng đợi offline,     │ change │ stream └────────────────────────────────┘
│  │                 change stream/poll) ──┘        │              ▲
│  └─ presence.service                              │              │ change stream
└───────────────────────────────────────────────────┘     ┌────────┴─────── Máy B ───────┐
```

- **Không có server ứng dụng.** Mỗi máy giữ một kết nối MongoDB trong main process. Ghi = `insertOne` một bản cập nhật Yjs; đọc realtime = **change stream** (Atlas là replica set). Nếu change stream không dùng được (Mongo đơn lẻ), tự chuyển sang hỏi vòng 1,5 giây.
- **CRDT Yjs** giải quyết xung đột: hai người sửa hai hình khác nhau → gộp cả hai; cùng sửa một hình → thay đổi sau cùng thắng theo từng phần tử. Không còn lỗi 409/“sửa ở tab khác” như kế hoạch web.
- **Nén dữ liệu:** khi một project có > 200 bản cập nhật, máy mở project gộp chúng (`Y.mergeUpdates`) thành 1 snapshot rồi xoá các bản đã gộp. Gộp trùng giữa hai máy vẫn an toàn vì Yjs idempotent.
- **Local-first:** mỗi project gắn một tệp `<thư mục>/<tên>.umlab` trên máy (chọn khi tạo project; danh mục ở `userData/local-projects.json`). Main process giữ một Y.Doc/project, ghi mọi thay đổi vào tệp trước rồi mới đẩy lên MongoDB; mở project = tệp local ⊕ bản trên DB, phần chỉ có ở local được đẩy lên (`Y.encodeStateAsUpdate(local, stateVector(remote))`). Mất mạng vẫn liệt kê / mở / sửa / tạo project; project tạo offline được ghi lên MongoDB khi có mạng lại. Chuỗi kết nối cố định theo bản build (không sửa trong app).
- **Offline:** mất mạng vẫn sửa được; cập nhật xếp hàng trong main process (ghi ra `userData/pending/`) và tự gửi khi có mạng lại. Sau khi kết nối lại, main nạp lại toàn bộ project và bắn `resync`.
- **Presence:** mỗi máy upsert một bản ghi `presence` (người dùng, sơ đồ đang mở, con trỏ, vùng chọn, đang kéo) — hiển thị avatar người đang xem và con trỏ của họ trên canvas.

## 2. Ánh xạ thành phần

| Kế hoạch web                    | Desktop                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/web` (Vite + React)       | `apps/desktop/src/renderer` (electron-vite, React 18, Tailwind 4)                                                |
| `apps/api` (NestJS)             | `apps/desktop/src/main/*.service.ts` + `ipc.ts`                                                                  |
| PostgreSQL + Prisma             | MongoDB (driver `mongodb`), collection như mục 3                                                                 |
| REST `/api/**`                  | IPC `window.umlab.*` (`src/shared/api.ts`)                                                                       |
| Cookie JWT access/refresh       | Phiên cục bộ mã hoá `safeStorage` + `tokenVersion` kiểm lại khi mở app, mỗi 60 giây và qua change stream `users` |
| `@nestjs/throttler`             | `login_attempts`: 5 lần sai/phút/email → chặn 1 phút                                                             |
| Optimistic lock `version` + 409 | CRDT Yjs, không cần                                                                                              |
| TanStack Query cache            | Y.Doc là nguồn sự thật; TanStack Query cho danh sách project                                                     |
| Zustand + Immer patches (undo)  | Zustand (trạng thái UI) + `Y.UndoManager` (undo/redo chỉ thao tác của mình, 200 bước)                            |
| `ProjectAccessGuard` (ownerId)  | `projects.members[]` với vai trò owner/editor/viewer, kiểm ở main                                                |
| Thumbnail lưu DB                | Dựng SVG thu nhỏ ngay ở renderer từ nội dung sơ đồ                                                               |
| Docker Compose, VPS, Caddy      | `electron-builder` → `UMLab-Setup.exe` (NSIS) + bản portable; CI GitHub Actions build trên `windows-latest`      |
| Bảng `Asset` (bytea/S3)         | collection `assets` (Binary ≤ 5 MB)                                                                              |
| Bảng `DiagramVersion`           | collection `diagram_versions` (snapshot JSON, giữ 50 bản/sơ đồ)                                                  |
| `/_ui` (dev)                    | Route `#/_ui` (chỉ bản dev)                                                                                      |
| Playwright web                  | Playwright `_electron`                                                                                           |

**Chia sẻ project (bổ sung so với kế hoạch):** vì mục tiêu là cộng tác, project có danh sách thành viên. Chủ project mời bằng email tài khoản UMLab, chọn vai trò _Chỉnh sửa_ / _Chỉ xem_. Trang chủ liệt kê project của mình và project được chia sẻ.

## 3. Collection MongoDB (database `umlab`)

| Collection         | Trường chính                                                                                                                                 | Index                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `users`            | `_id`, `email` (chữ thường), `username` (chữ thường; thiếu = email), `name`, `passwordHash` (argon2id), `tokenVersion`, `color`, `createdAt` | `email` unique, `username` unique (partial) |
| `login_attempts`   | `_id` = email, `count`, `firstAt`                                                                                                            | TTL `firstAt` 60 s                          |
| `projects`         | `_id`, `ownerId`, `name`, `description`, `color`, `icon`, `members[{userId, role}]`, `memberIds[]`, `stats`, `createdAt`, `updatedAt`        | `memberIds`, `updatedAt`                    |
| `project_updates`  | `_id` (ObjectId), `projectId`, `kind` (`u` cập nhật / `s` snapshot), `data` (Binary), `clientId`, `userId`, `createdAt`                      | `projectId`                                 |
| `presence`         | `_id` = `projectId:clientId`, `projectId`, `userId`, `name`, `color`, `diagramId`, `cursor`, `selection`, `dragging`, `updatedAt`            | `projectId`, TTL `updatedAt` 60 s           |
| `diagram_versions` | `_id`, `projectId`, `diagramId`, `label`, `content` (JSON nén chuỗi), `userId`, `createdAt`                                                  | `{projectId, diagramId, createdAt}`         |
| `assets`           | `_id`, `projectId`, `name`, `mime`, `size`, `data` (Binary), `createdAt`                                                                     | `projectId`                                 |

## 4. Cấu trúc Y.Doc của một project

| Khoá (`doc.getMap`) | Nội dung                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `meta`              | `ucCounter`, `typeMap` (bảng kiểu ORM tuỳ chỉnh), …                                                               |
| `folders`           | `id → { id, parentId, name, order }`                                                                              |
| `diagrams`          | `id → { id, type, name, folderId, order, createdAt, updatedAt, updatedBy, generatedFrom, canvas }`                |
| `views:<diagramId>` | `id → View` (spec/json-format.md)                                                                                 |
| `conns:<diagramId>` | `id → Connector`                                                                                                  |
| `data:<diagramId>`  | Dữ liệu loại không phải canvas: Gantt (`meta`, `task:<id>`, `order`), đặc tả use case (mỗi trường cấp 1 một khoá) |
| `model`             | `id → ModelElement` dùng chung toàn project                                                                       |

Giá trị là JSON thuần (thay cả object khi sửa) → xung đột ở mức phần tử. Định dạng xuất/nhập JSON giữ nguyên `spec/json-format.md`.

## 5. Ghi chú theo phase

- **P00**: monorepo npm workspaces (`apps/desktop`, `packages/core`, `packages/uml-icons`); token màu, theme 3 chế độ, logo, UI kit; cửa sổ Electron có thanh tiêu đề tích hợp (`titleBarOverlay`); trang Cài đặt → Kết nối MongoDB; CI.
- **P01**: auth ở main process (bảng ở mục 2). Không có refresh token; “Ghi nhớ đăng nhập” = lưu phiên đã mã hoá ra đĩa, bỏ chọn = chỉ giữ trong bộ nhớ tới khi tắt app.
- **P02**: CRUD project + **thành viên/chia sẻ**; nhân bản/nhập/xuất JSON làm ở renderer trên Y.Doc rồi gửi qua `projects.create(initialUpdate)`.
- **P03**: cây thư mục/sơ đồ là dữ liệu trong Y.Doc; “autosave” = mọi thay đổi gửi đi ngay (gộp 250 ms); trạng thái “Đã lưu · 10:32” theo xác nhận ghi DB; thay dialog 409 bằng presence (ai đang xem sơ đồ nào).
- **P13**: thay “triển khai VPS” bằng đóng gói `.exe` + hướng dẫn cấu hình Atlas (user riêng, IP access list); bỏ “quên mật khẩu qua email” (không có server gửi mail) — thay bằng chủ project/ quản trị đặt lại qua công cụ `scripts/reset-password` (tuỳ chọn). Đã làm: `docs/DEPLOY.md`, `npm run reset-password`. Lịch sử phiên bản lưu ở collection `diagram_versions`; ảnh vẫn nhúng trong Y.Doc (local-first, dùng được offline) thay vì bảng `Asset`.
