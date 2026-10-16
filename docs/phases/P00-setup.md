# P00 — Khởi tạo dự án

**Mục tiêu:** repo chạy được `pnpm dev` với web + api + postgres, có design tokens và logo UMLab.

## Việc cần làm

1. Monorepo pnpm: `apps/web`, `apps/api`, `packages/core`, `packages/uml-icons`; `tsconfig.base.json` strict; ESLint + Prettier dùng chung; Husky + lint-staged.
2. `apps/web`: Vite + React 18 + TS + Tailwind + React Router + TanStack Query + Zustand. Alias `@/`.
3. `apps/web/src/styles/tokens.css`: chép bộ token màu từ `docs/reference/unipark-diagram-studio.html` (`--bg --panel --panel-2 --line --text --muted --accent --accent-soft --danger --ok --canvas --dot --sel --guide`) cho 3 trạng thái theme. Tailwind `theme.extend.colors` trỏ vào token. Font Be Vietnam Pro qua `@fontsource/be-vietnam-pro`; Roboto qua `@fontsource/roboto`.
4. Theme provider: 3 chế độ Hệ thống/Sáng/Tối, lưu localStorage, nút chuyển giống tool cũ.
5. Logo: chép `docs/assets/brand/*.svg` vào `apps/web/public/brand/`; favicon = `umlab-icon.svg`; component `<Logo variant="full|icon" />` tự chọn bản sáng/tối.
6. `apps/api`: NestJS 10, `ConfigModule` (zod validate env), `PrismaModule`, prefix `/api`, Swagger ở `/api/docs`, health check `/api/health`.
7. `docker-compose.yml`: postgres:16 (volume), api, web; `.env.example`.
8. `packages/core`: Vitest, export rỗng `index.ts`; `packages/uml-icons`: mỗi icon một file `.svg` 16×16 + script sinh `index.ts` (map tên → chuỗi SVG) và trang xem trước `pnpm --filter uml-icons preview`.
9. CI GitHub Actions: install, lint, typecheck, test (có Postgres service).
10. Thư mục UI kit `apps/web/src/ui/`: Button (primary/outline/ghost/danger), IconButton, Input, Textarea, Select, Segmented, Checkbox, Dialog, ConfirmDialog (không dùng `window.confirm`), Toast, Tooltip, DropdownMenu, ContextMenu, Tabs, Tree (dùng ở P03). Style theo tool cũ (bo 6–8px, viền `--line`, cao 30px).

## Tiêu chí nghiệm thu

- `docker compose up -d postgres && pnpm dev` mở được web (trang "UMLab" với logo) và `/api/health` trả `{ ok: true }`.
- Đổi theme 3 chế độ đúng, F5 giữ lựa chọn.
- Trang `/_ui` (chỉ dev) hiển thị đủ component UI kit ở cả sáng và tối.
- CI xanh.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/README.md và docs/phases/P00-setup.md. Thực hiện toàn bộ P00.
Lấy token màu và style control từ docs/reference/unipark-diagram-studio.html (phần <style> :root và các class .btn, .ibtn, .field, .seg, .modal).
Logo nằm ở docs/assets/brand/. Không làm gì thuộc P01 trở đi.
Kết thúc: chạy lint, typecheck, test; liệt kê file đã tạo và cách chạy.
```
