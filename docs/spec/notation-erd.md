# Sơ đồ cơ sở dữ liệu (ERD) — palette & ký hiệu

> Chưa có ảnh chụp palette ERD của VP trong yêu cầu. Danh sách dưới đây theo bộ công cụ Entity Relationship Diagram thường thấy của VP. Nên chụp thêm palette ERD trong VP để đối chiếu trước khi làm P09.

Sơ đồ có 2 chế độ (chọn khi tạo, đổi được trong Inspector của sơ đồ):

- **Vật lý (Crow's foot)** — mặc định. Dùng cho thiết kế bảng, parse ORM, xuất DDL.
- **Khái niệm (Chen)** — tuỳ chọn, cho mô hình thực thể–kết hợp hay dạy ở trường (P09 mục 9.8).

## 1. Palette chế độ Vật lý

```
Cursor◢
Entity · One-to-One Relationship · One-to-Many Relationship · Many-to-Many Relationship
View · Stored Procedures · Stored Procedure ResultSet · Triggers · Sequence
Note · Anchor · Constraint
| Package◢ · Diagram Overview · Generic Connector · User Story · Image · Screen Capture · Callout
  Rectangle · Oval · Polygon · Line · Text Box · Diagram Info
| Pencil · Pen · Calligraphy Tool · Connector
```

### Entity — `erd.entity` / `erd.entity`

Ký hiệu: hình chữ nhật bo góc nhẹ, **đầu bảng** màu (tên bảng đậm, tuỳ chọn tên logic phía trên nhỏ), thân là các cột; **ngăn cột khoá chính** tách khỏi các cột còn lại bằng đường kẻ.

Mỗi dòng cột: `[icon] tên_cột   KIỂU(độ dài)   N/U`

- icon 🔑 vàng = PK, icon 🔑 xám/xanh = FK, PK+FK = cả hai; ◇ = cột thường; chấm = có index.
- `N` = nullable, `U` = unique (hiển thị tuỳ chọn).

Thuộc tính model:

```ts
{ name; logicalName?; schema?; comment;
  columns: { id; name; logicalName?; type; length?; precision?; scale?;
             pk: boolean; nullable: boolean; unique: boolean; autoIncrement: boolean;
             default?: string; check?: string; comment?: string;
             fk?: { relationshipId; refEntityId; refColumnId } }[];
  indexes: { id; name; columns: string[]; unique: boolean; method?: 'btree'|'hash'|'gin' }[];
  uniqueConstraints: { name; columns: string[] }[];
  checks: { name; expr }[];
  mappedFrom?: { classId; strategy } }   // khi sinh từ class diagram
```

Kiểu dữ liệu: danh sách theo dialect đang chọn của sơ đồ (PostgreSQL mặc định; MySQL; SQL Server).

Sửa nhanh: chọn entity → `Alt+Shift+C` thêm cột, gõ `email varchar(255) unique not null`. Parser `packages/core/src/erd/parse-column.ts`.

Catalog: One-to-Many → Entity mới; One-to-One → Entity mới; Many-to-Many → Entity mới.

### Các hình khác

| Công cụ                    | Shape            | Ký hiệu                                                                        | Thuộc tính                                                                                           |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| View                       | `erd.view`       | Như entity, đầu bảng màu khác (tím nhạt) và nhãn `«view»`                      | name, definition (SQL), columns (tự suy ra từ SELECT nếu parse được, hoặc nhập tay)                  |
| Stored Procedures          | `erd.procedures` | Hình chữ nhật đầu `«stored procedures»`, danh sách thủ tục `ten(p1 IN int, …)` | procedures[] { name, params[] {name, type, mode IN/OUT/INOUT}, returns?, body }                      |
| Stored Procedure ResultSet | `erd.resultset`  | Như entity, nhãn `«result set»`, chỉ có cột                                    | name, procedureId, columns[]                                                                         |
| Triggers                   | `erd.triggers`   | Hình chữ nhật đầu `«triggers»`, danh sách `ten BEFORE INSERT ON bang`          | triggers[] { name, timing BEFORE/AFTER/INSTEAD OF, events[], entityId, forEach ROW/STATEMENT, body } |
| Sequence                   | `erd.sequence`   | Hình chữ nhật nhỏ `«sequence»` + tên                                           | name, start, increment, min, max, cycle                                                              |

## 2. Đường quan hệ (Crow's foot)

| Công cụ                   | kind        | Ký hiệu mặc định                    | Khi tạo                                                                                                               |
| ------------------------- | ----------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| One-to-One Relationship   | `erd.rel11` | Cha `‖` (one and only one) — Con `○ | ` (zero or one)                                                                                                       | Thêm cột FK vào con, đặt **UNIQUE** |
| One-to-Many Relationship  | `erd.rel1n` | Cha `‖` — Con `○<` (zero or many)   | Thêm cột FK `<cha>_id` vào con, kiểu = kiểu PK cha                                                                    |
| Many-to-Many Relationship | `erd.relnn` | `>○` — `○<`                         | Hỏi: **Tạo bảng trung gian** (`a_b` với PK ghép 2 FK + 2 quan hệ 1-N) / **Giữ N-N khái niệm** (cảnh báo khi xuất DDL) |

Thuộc tính quan hệ:

```ts
{
  name;
  identifying: boolean; // true → nét liền, FK nằm trong PK con; false → nét đứt
  parent: {
    entityId;
    cardinality: 'one' | 'zeroOrOne';
  }
  child: {
    entityId;
    cardinality: 'one' | 'zeroOrOne' | 'oneOrMany' | 'zeroOrMany';
  }
  fkColumns: {
    childColumnId;
    parentColumnId;
  }
  [];
  onDelete: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
  onUpdate: same;
}
```

- Đổi cardinality trong Inspector bằng 4 nút hình crow's foot cho mỗi đầu.
- Xoá quan hệ → hỏi có xoá cột FK đã sinh không.
- Đổi tên/kiểu PK cha → cột FK con cập nhật theo.

## 3. Kiểm tra

- Entity không có PK.
- FK trỏ tới cột không phải PK/UNIQUE.
- Kiểu cột FK khác kiểu cột được tham chiếu.
- Trùng tên bảng/cột (không phân biệt hoa thường).
- Tên dùng từ khoá SQL của dialect (`user`, `order`…) → gợi ý đặt trong ngoặc kép hoặc đổi tên.
- Quan hệ N-N chưa có bảng trung gian khi xuất DDL.

## 4. Xuất/nhập

- **Xuất SQL DDL** (PostgreSQL/MySQL/SQL Server): `CREATE TABLE` theo thứ tự phụ thuộc, `ALTER TABLE … ADD CONSTRAINT FK`, index, sequence, view, comment. Hộp xem trước có highlight cú pháp + Sao chép + Tải `.sql`.
- **Nhập DDL** (tuỳ chọn): dán `CREATE TABLE …` → sinh entity + quan hệ (dùng `node-sql-parser`).
- **Xuất Prisma schema / TypeORM entity** (tuỳ chọn P13).

## 5. Chế độ Khái niệm (Chen) — tuỳ chọn

| Công cụ                  | Shape                   | Ký hiệu                                                                                         |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------- |
| Entity                   | `chen.entity`           | Hình chữ nhật                                                                                   |
| Weak Entity              | `chen.weakEntity`       | Hình chữ nhật **viền kép**                                                                      |
| Relationship             | `chen.relationship`     | Hình thoi                                                                                       |
| Identifying Relationship | `chen.identRel`         | Hình thoi **viền kép**                                                                          |
| Attribute                | `chen.attribute`        | Elip                                                                                            |
| Key Attribute            | `chen.keyAttr`          | Elip, tên **gạch chân**                                                                         |
| Partial Key              | `chen.partialKey`       | Elip, tên gạch chân **nét đứt**                                                                 |
| Multivalued Attribute    | `chen.multiAttr`        | Elip **viền kép**                                                                               |
| Derived Attribute        | `chen.derivedAttr`      | Elip **nét đứt**                                                                                |
| Composite Attribute      | `chen.attribute` có con | Elip nối tới các elip con                                                                       |
| Link                     | `chen.link`             | Đường liền; nhãn cardinality `1`, `N`, `M` hoặc `(min,max)`; **đường kép** = tham gia toàn phần |

Có nút "Chuyển sang mô hình vật lý" (P09 mục 9.8): entity → bảng, key attribute → PK, relationship 1-N/N-N → FK/bảng trung gian, multivalued → bảng phụ.

## 6. Icon cần vẽ

`entity, rel-1-1, rel-1-n, rel-n-n, view, stored-procedures, resultset, triggers, sequence, chen-entity, chen-weak-entity, chen-relationship, chen-ident-rel, chen-attribute, chen-key-attr, chen-multi-attr, chen-derived-attr`
