# P13 — Hoàn thiện & triển khai

## Việc cần làm

1. **Hiệu năng:** đo sơ đồ 1.000 hình; virtual list cho cây thư mục lớn; lazy-load editor theo loại (code splitting).
2. **Ảnh tải lên:** bảng `Asset` (projectId, mime, size, data bytea hoặc S3/MinIO), thay base64 trong Image/Screen Capture; giới hạn 5 MB/ảnh.
3. **Lịch sử phiên bản sơ đồ:** bảng `DiagramVersion` (snapshot mỗi lần lưu cách nhau ≥ 5 phút, giữ 50 bản); xem & khôi phục.
4. **Trợ năng:** điều hướng bàn phím trong palette/cây, focus ring, `aria-label`, tương phản đạt AA ở cả 2 theme.
5. **Responsive:** dashboard dùng được trên tablet; editor trên điện thoại ở chế độ xem + chỉnh nhẹ.
6. **Tuỳ chọn:** xuất code khung (TypeScript/Java) từ class; xuất Prisma/TypeORM từ ERD; quên mật khẩu qua email (SMTP).
7. **Kiểm thử E2E** bộ đầy đủ: luồng UniPark+ từ tạo project → vẽ use case → đặc tả UC03 → sinh activity & sequence → class → parse ERD → DDL → xuất JSON project → nhập lại.
8. **Triển khai:** Dockerfile multi-stage cho web (nginx phục vụ static + proxy `/api`) và api; `docker-compose.prod.yml`; migrate tự chạy khi khởi động; backup Postgres hằng ngày; hướng dẫn deploy lên VPS (Ubuntu) có HTTPS (Caddy).
9. Trang **Giới thiệu/Trợ giúp**: phím tắt, ký hiệu từng sơ đồ (sinh từ registry), định dạng JSON.

## Tiêu chí nghiệm thu

- E2E toàn luồng xanh trên CI.
- Lighthouse dashboard ≥ 90 Performance/Accessibility.
- Deploy thử trên VPS, đăng nhập qua HTTPS, cookie `Secure`.

## Prompt cho Claude Code

```
Đọc CLAUDE.md và docs/phases/P13-polish-deploy.md. Làm lần lượt mục 1→9, mỗi mục một commit; hỏi tôi trước khi làm các mục tuỳ chọn ở mục 6.
```
