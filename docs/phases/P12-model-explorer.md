# P12 — Model Explorer, truy vết, tìm kiếm

**Mục tiêu:** quản lý phần tử mô hình xuyên suốt project như Model Explorer của VP.

## Việc cần làm

1. Tab **Model Explorer** (thanh dọc trái editor): cây theo package → loại phần tử (Actors, Use Cases, Classes, Interfaces, Entities, Activities…). Tìm kiếm, lọc theo loại.
2. Kéo phần tử từ Model Explorer thả vào canvas → tạo **view mới cùng modelId** (cùng phần tử). Phần tử đã có trên sơ đồ hiện in đậm.
3. Chuột phải phần tử: **Xuất hiện ở các sơ đồ** (danh sách, bấm để mở và chọn hình), Đổi tên (cập nhật mọi view), Xoá khỏi mô hình (xác nhận, liệt kê sơ đồ bị ảnh hưởng).
4. **Ma trận truy vết** (trang trong dashboard): Use Case × (Đặc tả, Activity, Sequence, Class liên quan) với ô ✓/–; bấm ô để mở.
5. **Tìm kiếm toàn project** (Ctrl+K ở dashboard và editor): tìm sơ đồ, phần tử, bước đặc tả; kết quả nhóm theo loại.
6. Dọn phần tử mồ côi (không còn view nào): danh sách + xoá hàng loạt.
7. (tuỳ chọn) Đồng bộ ngược sơ đồ sinh ra → đặc tả (generators.md mục 3).

## Tiêu chí nghiệm thu

- Actor "Sinh viên" kéo vào 3 sơ đồ khác nhau; đổi tên một lần → 3 sơ đồ cùng đổi.
- Ma trận truy vết hiển thị đúng cho bộ UniPark+.
- Ctrl+K gõ "check" ra use case Check-in, đặc tả UC03 và activity sinh từ nó.

## Prompt cho Claude Code

```
Đọc CLAUDE.md và docs/phases/P12-model-explorer.md. Thực hiện P12 dùng API /api/projects/:pid/model đã có từ P03
(bổ sung endpoint usages: GET /api/model/:id/usages).
```
