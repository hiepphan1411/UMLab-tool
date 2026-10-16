# P08 — Class Diagram

**Mục tiêu:** Class Diagram với đủ palette như hình 2. Đặc tả: [spec/notation-class.md](../spec/notation-class.md).

## Việc cần làm

1. Palette đúng thứ tự spec, các flyout: Class◢ (Class, Interface, Enumeration, Data Type, Primitive Type, Signal), Generalization◢ (Generalization, Realization), Association◢ (Association, Directed, Aggregation, Composition), Dependency◢ (5 stereotype), Abstraction◢ (5 stereotype).
2. Shape Class 3 ngăn đúng ký hiệu: stereotype, abstract nghiêng, static gạch chân, template param, active class; Interface (cả dạng lollipop), Enumeration (literals), Data Type, Primitive, Signal, N-ary Association (thoi), Association Class (nối nét đứt vào giữa association), Collaboration, Model, REST Service (ngăn URI/Method/Request/Response, màu theo method).
3. Parser/formatter thành viên `parse-member.ts` (test đủ các dạng trong spec); gợi ý kiểu khi gõ `:`; phím `Alt+Shift+A` / `Alt+Shift+O`.
4. Association đầy đủ: tên + ▶ hướng đọc, role/multiplicity/navigability (✕ cho non-navigable)/aggregation/`{ordered}`/qualifier ở từng đầu; nhãn tự lật; self-association.
5. Kiểm tra theo spec mục 3; gạch lượn sóng kiểu không tồn tại + quick fix "Tạo class".
6. "Chuyển thuộc tính thành association" và ngược lại.
7. Class dùng chung toàn project (model element) — đổi tên class ở một sơ đồ, mọi sơ đồ cập nhật.
8. Nút **Parse ORM → ERD** trên thanh công cụ: disabled cho tới P09.
9. Mẫu "Class UniPark+" (User, SinhVien, Xe, TheRFID, PhienGuiXe, GoiThang, ViDienTu, GiaoDich, ReputationEvent + quan hệ).
10. Icon palette theo danh sách trong spec.

## Tiêu chí nghiệm thu

- Gõ `- bienSo : String [1] {unique}` → hiển thị đúng và lưu đủ trường.
- Composition từ PhienGuiXe ◆— Xe hiển thị thoi đặc ở đúng đầu; đổi multiplicity trong Inspector thấy ngay.
- Interface + Realization (nét đứt tam giác rỗng) đúng ký hiệu.
- Xuất SVG mở bằng trình duyệt, chữ nghiêng/gạch chân đúng.
- Unit test parser ≥ 20 trường hợp.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/engine.md, docs/spec/notation-class.md, docs/phases/P08-class.md.
Thực hiện P08 trong features/editors/class. Parser thành viên đặt trong packages/core/src/uml có test.
Chia 2 phiên: (1) mục 1–3; (2) mục 4–10.
```
