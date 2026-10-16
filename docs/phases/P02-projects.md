# P02 — Trang chủ: quản lý project

**Mục tiêu:** sau đăng nhập thấy danh sách project; chưa có thì được mời tạo.

## Backend (`modules/projects`)

| Method | Route                                      | Mô tả                                                                                            |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| GET    | `/api/projects?search=&sort=updated\|name` | Danh sách của user + `diagramCountByType`                                                        |
| POST   | `/api/projects`                            | `{ name, description, color, icon, template: 'blank'\|'unipark-sample' }`                        |
| GET    | `/api/projects/:id`                        | Chi tiết                                                                                         |
| PATCH  | `/api/projects/:id`                        | Sửa tên/mô tả/màu/icon                                                                           |
| DELETE | `/api/projects/:id`                        | Xoá (cascade)                                                                                    |
| POST   | `/api/projects/:id/duplicate`              | Nhân bản toàn bộ (sinh lại id)                                                                   |
| GET    | `/api/projects/:id/export`                 | File JSON `kind: project`                                                                        |
| POST   | `/api/projects/import`                     | Nhận JSON `umlab` project **hoặc** `unipark-diagram` cũ (dùng `migrateLegacyUnipark` trong core) |

- `ProjectAccessGuard` kiểm `ownerId`.
- Template `unipark-sample`: tạo thư mục mẫu + sơ đồ kiến trúc và 2 Gantt từ fixture `unipark-plus.json` (có sẵn ở `docs/reference/`).

## Frontend `/projects`

- Thanh trên: logo, ô tìm kiếm, nút **+ Tạo project**, nút **Nhập project**, menu tài khoản.
- **Lưới thẻ project** (3–4 cột desktop, 1 cột điện thoại): ô màu + icon project, tên, mô tả 2 dòng, "Cập nhật 2 giờ trước", hàng chip số sơ đồ theo loại (icon loại + số). Bấm thẻ → `/p/:id`. Menu ⋯: Mở, Đổi tên, Sửa thông tin, Nhân bản, Xuất JSON, Xoá (xác nhận gõ lại tên project).
- **Trạng thái trống:** minh hoạ + "Chưa có project nào" + nút lớn "Tạo project đầu tiên" + "Hoặc nhập từ tệp JSON".
- Dialog tạo project: tên (bắt buộc), mô tả, chọn màu (8 ô), chọn icon (lưới ~24 icon lucide), mẫu: Trống / Mẫu UniPark+.
- Sắp xếp: Mới cập nhật · Tên A–Z. Chế độ xem: Lưới / Danh sách.

## Tiêu chí nghiệm thu

- User mới thấy trạng thái trống; tạo project → chuyển thẳng vào `/p/:id`.
- Nhập `unipark-plus.json` (file cũ) → tạo project có 1 sơ đồ kiến trúc + 2 Gantt.
- Xuất project rồi nhập lại → project mới giống hệt, id khác.
- User A không truy cập được project của user B (403).
- Playwright: tạo → đổi tên → nhân bản → xoá.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/phases/P02-projects.md và docs/spec/json-format.md (mục 2 và 4).
Thực hiện P02. Viết migrateLegacyUnipark trong packages/core kèm unit test dùng docs/reference/unipark-plus.json.
Ở bước này nội dung sơ đồ chỉ cần lưu đúng JSON; chưa cần editor.
```
