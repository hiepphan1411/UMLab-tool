# P06 — Use Case Diagram

**Mục tiêu:** vẽ Use Case Diagram với đủ palette như hình 1 của Visual Paradigm. Đặc tả: [spec/notation-usecase.md](../spec/notation-usecase.md).

## Việc cần làm

1. Đăng ký palette đúng thứ tự trong spec (kể cả Cursor◢, Generalization◢, Package◢ và nhóm chung).
2. Shape: Use Case (elip tự giãn theo tên, ngăn extension points, business use case), Actor (hình người que, 3 kiểu hiển thị, business actor), System (container, tên trên giữa), Collaboration (elip nét đứt).
3. Connector: Association (multiplicity 2 đầu, navigable), Include, Extend (condition, extension point + note điều kiện), Dependency (stereotype), Generalization, Realization. Luật `allow()` đúng bảng trong spec.
4. Model element `uml.usecase`, `uml.actor`, `uml.subject`, `uml.collaboration`; mã UC tự tăng theo project (`UC01`…), sửa được.
5. Resource Catalog cho Actor và Use Case như cột Catalog.
6. Validation rules mục 3 của spec.
7. Menu chuột phải Use Case: **Tạo đặc tả** / **Mở đặc tả** (P07 làm nội dung; ở P06 chỉ tạo sơ đồ `usecase-spec` rỗng gắn `useCaseId`) và icon tài liệu trên use case đã có đặc tả.
8. Icon palette: `usecase, association, actor, system, include, extend, dependency, generalization, realization, collaboration`.
9. Mẫu khi tạo mới: "Trống" / "Use case UniPark+" (Sinh viên, Bảo vệ, Quản trị viên; UC Đăng nhập, Check-in, Check-out, Nạp ví, Mua gói tháng, Khiếu nại vi phạm…).

## Tiêu chí nghiệm thu

- Vẽ lại được sơ đồ use case UniPark+ hiện có của bạn chỉ bằng palette (không cần hình tự do).
- Kéo Include từ Actor sang Use Case → bị chặn với tooltip "Include chỉ nối giữa hai use case".
- Extend chọn được extension point của use case base; đổi tên extension point → nhãn cập nhật.
- Cùng một Actor kéo từ Model Explorer (P12) sang sơ đồ khác vẫn là một phần tử (chuẩn bị: modelId giữ nguyên khi copy/paste).
- Xuất PNG/SVG/JSON đúng; nhập lại JSON giống hệt.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/engine.md, docs/spec/notation-usecase.md, docs/phases/P06-usecase.md.
Thực hiện P06 trong features/editors/usecase bằng API registry của engine. Không sửa engine trừ khi thiếu API (ghi rõ lý do).
Vẽ icon mới trong packages/uml-icons. Thêm rules validation và test cho allow() của từng connector.
```
