# Use Case Diagram — palette & ký hiệu

Thứ tự palette (theo hình 1). `|` là đường kẻ ngăn nhóm. ◢ là mục có flyout.

```
Cursor◢
Use Case · Association · Actor · System · Include · Extend · Dependency · Generalization◢ · Collaboration
Element Group · Note · Anchor · Constraint · Containment
| Allocate · Rationale · Problem
| Package◢ · Diagram Overview · Generic Connector · User Story · Image · Screen Capture · Callout
  Rectangle · Oval · Polygon · Line · Text Box · Diagram Info
| Pencil · Pen · Calligraphy Tool · Connector
```

Nhóm sau `Element Group` đặc tả ở [notation-common.md](notation-common.md).

**Cursor ◢** (dùng cho mọi sơ đồ): Chọn (V), Kéo khung nhìn (H), Chọn vùng tự do (lasso).

## 1. Hình (node)

| Công cụ       | Shape / modelKind                        | Ký hiệu                                                                                                                                                            | Thuộc tính model                                                                                                                                                                 | Thuộc tính view                                | Catalog                                                                                              |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Use Case      | `uc.usecase` / `uml.usecase`             | Elip, tên giữa. Khi có extension point: kẻ ngang dưới tên, dòng `extension points` in nghiêng rồi danh sách. Business use case: thêm **vạch chéo** ở mép trái dưới | `code` (UC01, tự tăng), `name`, `description`, `rank` (Cao/Trung bình/Thấp), `status` (Đề xuất/Đã duyệt/Hoàn thành), `isBusiness`, `extensionPoints[]{id,name}`, `specDiagramId` | hiện/ẩn extension points, hiện mã UC trước tên | Include → Use Case; Extend → Use Case; Association → Actor; Generalization → Use Case; Anchor → Note |
| Actor         | `uc.actor` / `uml.actor`                 | **Hình người que** (đầu tròn, thân, tay, 2 chân), tên bên dưới. Biến thể hiển thị: hình người / hình chữ nhật `«actor»` / icon. Business actor: vạch chéo qua đầu  | `name`, `description`, `isBusiness`, `type` (Người dùng/Hệ thống ngoài/Thiết bị)                                                                                                 | kiểu hiển thị                                  | Association → Use Case; Generalization → Actor                                                       |
| System        | `uc.system` / `uml.subject`              | Hình chữ nhật, **tên ở mép trên giữa** (in đậm)                                                                                                                    | `name`                                                                                                                                                                           | —                                              | —                                                                                                    |
| Collaboration | `uc.collaboration` / `uml.collaboration` | **Elip nét đứt**, tên giữa                                                                                                                                         | `name`, `description`                                                                                                                                                            | —                                              | Realization → Use Case                                                                               |

**System** là container: chỉ nhận `uc.usecase`, `uc.collaboration`, `common.note`, `common.textbox`. Thả Actor vào trong → cảnh báo "Actor thường nằm ngoài ranh giới hệ thống" (vẫn cho phép).

## 2. Đường nối

| Công cụ                           | kind                | Ký hiệu                                                                                                                                        | Hướng & luật                                                                            | Thuộc tính                                                                          |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Association                       | `uc.association`    | Đường **liền**, không mũi tên (bật navigable → mũi tên mở ở đầu đích)                                                                          | Actor ↔ Use Case (khuyến nghị). Use Case ↔ Use Case: cảnh báo. Actor ↔ Actor: không cho | name, multiplicity nguồn/đích (`1`, `0..1`, `*`, `1..*`), navigable                 |
| Include                           | `uc.include`        | **Nét đứt**, mũi tên mở ở đích, nhãn `«include»` giữa đường                                                                                    | Use Case (base) → Use Case (được include). Cấm tự include. Cảnh báo vòng include        | —                                                                                   |
| Extend                            | `uc.extend`         | **Nét đứt**, mũi tên mở ở đích, nhãn `«extend»`; nếu có điều kiện: nhãn phụ `[condition]` và note đính kèm "Condition: {…} extension point: …" | Use Case (mở rộng) → Use Case (base)                                                    | `condition`, `extensionPoint` (chọn từ extension points của base; có nút "Tạo mới") |
| Dependency                        | `uc.dependency`     | **Nét đứt**, mũi tên mở, stereotype tuỳ chọn                                                                                                   | Bất kỳ phần tử → bất kỳ                                                                 | name, stereotype (`«use»`, `«trace»`, tự nhập)                                      |
| Generalization ◢ → Generalization | `uc.generalization` | Đường **liền**, **tam giác rỗng** ở đầu cha                                                                                                    | Actor → Actor, Use Case → Use Case (con → cha). Cấm khác loại, cấm vòng                 | —                                                                                   |
| Generalization ◢ → Realization    | `uc.realization`    | **Nét đứt**, tam giác rỗng                                                                                                                     | Collaboration → Use Case                                                                | —                                                                                   |

## 3. Kiểm tra (validation)

- Use case không có association với actor nào (trừ khi được include/extend bởi use case khác).
- Actor không nối với use case nào.
- Vòng lặp include hoặc generalization.
- Extend chọn extension point không tồn tại trên base.
- Trùng tên use case trong cùng System.
- Use case chưa có đặc tả (thông tin, không phải lỗi) → nút "Tạo đặc tả".

## 4. Liên kết với đặc tả

- Menu chuột phải Use Case: **Mở đặc tả** / **Tạo đặc tả** → tạo (hoặc mở) sơ đồ `usecase-spec` gắn `useCaseId`.
- Use case đã có đặc tả hiển thị icon tài liệu nhỏ ở góc phải trên elip.
- Thông tin include/extend, actor chính/phụ được đẩy sang đặc tả tự động (xem [usecase-spec-template.md](usecase-spec-template.md)).

## 5. Icon cần vẽ

`usecase, association, actor, system, include, extend, dependency, generalization, realization, collaboration` + nhóm chung.
