# P03 — Dashboard project, cây thư mục, quản lý sơ đồ

**Mục tiêu:** trong một project, tổ chức sơ đồ theo cây thư mục, xem theo cây hoặc theo loại, tạo/mở/nhập/xuất sơ đồ.

## Backend

| Method            | Route                                | Mô tả                                                                                           |
| ----------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| GET               | `/api/projects/:pid/tree`            | `{ folders[], diagrams[] (không kèm content) }`                                                 |
| POST/PATCH/DELETE | `/api/projects/:pid/folders[/:id]`   | Tạo, đổi tên, chuyển cha, đổi thứ tự, xoá (`?mode=cascade\|moveToParent`)                       |
| POST              | `/api/projects/:pid/diagrams`        | `{ type, name, folderId, content? }`                                                            |
| GET               | `/api/diagrams/:id`                  | Kèm `content` + model element được tham chiếu                                                   |
| PUT               | `/api/diagrams/:id`                  | `{ content, modelUpserts[], modelDeletes[], version }` trong 1 transaction; sai `version` → 409 |
| PATCH             | `/api/diagrams/:id`                  | Đổi tên, chuyển thư mục, thứ tự                                                                 |
| POST              | `/api/diagrams/:id/duplicate`        |                                                                                                 |
| DELETE            | `/api/diagrams/:id`                  |                                                                                                 |
| GET               | `/api/diagrams/:id/export`           | JSON `kind: diagram`                                                                            |
| POST              | `/api/projects/:pid/diagrams/import` | JSON `kind: diagram` (quy tắc trong spec/json-format.md mục 3)                                  |
| GET               | `/api/projects/:pid/model?kind=`     | Model elements (dùng P12)                                                                       |

Validate `content` bằng schema zod theo `type` trong `packages/core`.

## Frontend `/p/:projectId`

Bố cục 3 vùng (style tool cũ):

- **Thanh trên:** logo (về trang chủ), breadcrumb `Projects / UniPark+ / Phân tích`, ô tìm sơ đồ, Nhập JSON, menu tài khoản.
- **Cột trái (260px, kéo được rộng):** chuyển chế độ **[Cây thư mục | Theo loại | Gần đây]**.
  - _Cây thư mục:_ thư mục mở/đóng, sơ đồ có icon theo loại; kéo thả để chuyển thư mục/đổi thứ tự (cả thư mục lẫn sơ đồ); chuột phải: Sơ đồ mới ▸ (8 loại), Thư mục mới, Đổi tên (F2), Nhân bản, Xuất JSON, Xoá; phím ↑↓←→ Enter điều hướng; nhớ trạng thái mở theo project.
  - _Theo loại:_ nhóm theo loại sơ đồ (Kiến trúc, Gantt, Use Case, Đặc tả UC, Class, ERD, Activity, Sequence) kèm số lượng; trong nhóm sắp theo tên; hiện đường dẫn thư mục mờ bên phải.
  - _Gần đây:_ 20 sơ đồ mở gần nhất.
- **Nội dung chính:**
  - Hàng **"Tạo sơ đồ mới"**: 8 thẻ có icon lớn và mô tả 1 dòng (ví dụ "Class Diagram — lớp, thuộc tính, quan hệ"). Bấm → hỏi tên + thư mục (mặc định thư mục đang chọn) → mở editor.
  - Danh sách sơ đồ của thư mục đang chọn: chế độ Lưới (thumbnail SVG) / Danh sách (bảng: tên, loại, cập nhật, kích thước). Chọn nhiều (Shift/Ctrl) → Chuyển thư mục, Xuất JSON gộp, Xoá.
  - Ô thống kê nhỏ: tổng sơ đồ theo loại.
- Route editor `/p/:pid/d/:did`: P03 dựng **khung editor** chung (thanh trên: tên sơ đồ sửa tại chỗ, trạng thái lưu "Đã lưu · 10:32", Undo/Redo, Xuất ảnh, Xuất/Nhập JSON, nút Kiểm tra, theme; trái: palette placeholder; phải: inspector placeholder). Nội dung editor làm từ P04.
- **Autosave:** debounce 1.5s sau thay đổi; khi 409 → dialog "Sơ đồ đã được sửa ở tab khác: Tải lại / Ghi đè".
- Cảnh báo rời trang khi còn thay đổi chưa lưu.

## Tiêu chí nghiệm thu

- Tạo thư mục lồng 3 cấp, kéo sơ đồ giữa các thư mục, đổi thứ tự; F5 giữ nguyên.
- Chuyển chế độ Theo loại hiển thị đúng nhóm và số lượng.
- Xoá thư mục có sơ đồ: hỏi Xoá cả nội dung / Chuyển nội dung lên thư mục cha.
- Xuất một sơ đồ ra JSON rồi nhập vào project khác → mở được.
- Mở 2 tab cùng sơ đồ, sửa ở cả hai → tab sau nhận dialog 409.
- Playwright: tạo thư mục → tạo sơ đồ Use Case → đổi tên → kéo sang thư mục khác.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/phases/P03-workspace.md, docs/spec/json-format.md.
Thực hiện P03: API folder/diagram, dashboard project (cây thư mục, theo loại, gần đây), khung editor chung với autosave.
Dùng component Tree trong ui kit (bổ sung kéo thả bằng @dnd-kit). Chưa làm canvas.
```
