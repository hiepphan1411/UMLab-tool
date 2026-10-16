# P07 — Đặc tả Use Case

**Mục tiêu:** soạn đặc tả có cấu trúc cho từng use case, làm nguồn để sinh Activity (P10) và Sequence (P11), xuất DOCX đúng mẫu báo cáo. Đặc tả: [spec/usecase-spec-template.md](../spec/usecase-spec-template.md).

## Việc cần làm

1. Schema zod `UseCaseSpec`, `Step`, `Flow` trong `packages/core/src/spec/`.
2. Editor `features/editors/usecase-spec`:
   - Mục lục trái, nội dung giữa, Inspector use case gốc bên phải.
   - Bảng luồng sự kiện 3 cột, Enter thêm bước, xen kẽ performer, kéo đổi thứ tự với **đánh số lại + cập nhật tham chiếu** của luồng rẽ.
   - Thẻ luồng thay thế/ngoại lệ (rẽ tại bước, điều kiện, các bước, kết thúc).
   - Chi tiết tương tác từng bước (target, tên, message, kind, returns), đánh dấu lặp, gọi use case khác.
   - Danh sách màn hình và dữ liệu liên quan (dữ liệu chọn được từ class trong project).
3. Đồng bộ với Use Case Diagram: actor chính/phụ gợi ý từ association; include/extend chỉ đọc; đổi tên use case ở một nơi cập nhật nơi kia; `spec.version` tăng khi nội dung đổi.
4. Kiểm tra: bước rỗng, rẽ/quay về bước không tồn tại, thiếu actor chính.
5. Xuất **DOCX** (thư viện `docx`) đúng bảng mẫu; xuất **Markdown**; xuất nhiều đặc tả cùng lúc từ dashboard (chọn nhiều → Xuất DOCX).
6. Xuất/nhập JSON như mọi sơ đồ.
7. Nút **Sinh Activity** và **Sinh Sequence** ở thanh trên: ở P07 hiển thị nhưng disabled với tooltip "Có ở bản cập nhật sau" — bật ở P10/P11.
8. Dashboard: đặc tả hiển thị dưới dạng thẻ có mã UC + tên; trong chế độ Theo loại có nhóm "Đặc tả Use Case".

## Tiêu chí nghiệm thu

- Nhập fixture UC03 (Check-in xe vào bãi) → hiển thị đúng 7 bước, A1, E1, E2.
- Chèn một bước mới giữa bước 3 và 4 → A1 tự đổi "tại bước 5", "quay lại bước 6".
- Xuất DOCX mở được bằng Word, bảng đúng định dạng.
- Unit test: renumber + cập nhật tham chiếu; serialize; sinh DOCX không lỗi.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/usecase-spec-template.md, docs/phases/P07-usecase-spec.md.
Thực hiện P07. Đặt toàn bộ logic dữ liệu (renumber, validate, toMarkdown, toDocx) trong packages/core có test;
UI ở features/editors/usecase-spec. Dùng fixture UC03 trong spec làm dữ liệu test.
```
