# Parse ORM: Class Diagram → ERD, và sinh DDL

Code: `packages/core/src/orm/`. Hàm `classToErd(model, options) → { entities, relationships, report }`, thuần, có unit test.

## 1. Mở chức năng

- Trên Class Diagram: nút **Parse ORM → ERD** (thanh công cụ), hoặc chuột phải vùng chọn → "Parse ORM các class đã chọn".
- Hộp thoại 3 bước:
  1. **Chọn class** (mặc định: class có stereotype `«entity»` hoặc `«table»`; nếu không class nào có thì chọn tất cả class non-abstract không có `«dto»`, `«enum»`, `«controller»`, `«service»`).
  2. **Tuỳ chọn:** dialect (PostgreSQL/MySQL/SQL Server); quy tắc đặt tên bảng (snake_case · giữ nguyên · số nhiều `vehicles`); tên cột (snake_case/camelCase); chiến lược kế thừa mặc định; kiểu khoá tự sinh (`BIGINT IDENTITY` / `UUID`); ERD đích (**tạo ERD mới** / cập nhật ERD đã liên kết).
  3. **Xem trước thay đổi:** bảng diff `+ Thêm / ~ Sửa / − Xoá` theo bảng → cột → khoá ngoại, có checkbox bỏ từng mục. Bấm **Áp dụng**.

## 2. Ánh xạ

| Class Diagram                                             | ERD                                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Class                                                     | Entity, tên theo quy tắc (`PhienGuiXe` → `phien_gui_xe`)                                                                                                                       |
| Attribute                                                 | Column                                                                                                                                                                         |
| Attribute có `{id}` hoặc stereotype `«PK»`, hoặc tên `id` | PK                                                                                                                                                                             |
| Không có PK                                               | Thêm cột `id` (kiểu khoá tự sinh)                                                                                                                                              |
| Multiplicity `[0..1]`                                     | `NULL`                                                                                                                                                                         |
| Multiplicity `[1]` (mặc định)                             | `NOT NULL`                                                                                                                                                                     |
| `{unique}`                                                | `UNIQUE`                                                                                                                                                                       |
| Default value                                             | `DEFAULT …`                                                                                                                                                                    |
| Attribute kiểu Enumeration                                | PostgreSQL: `CREATE TYPE … AS ENUM`; MySQL: `ENUM(...)`; SQL Server: `VARCHAR + CHECK`                                                                                         |
| Attribute multiplicity `[*]` kiểu cơ bản                  | Bảng phụ `<bang>_<thuoc_tinh>` (fk + value)                                                                                                                                    |
| Attribute `«transient»` / static / derived                | Bỏ qua                                                                                                                                                                         |
| Operation                                                 | Bỏ qua                                                                                                                                                                         |
| Association 1 – *                                         | FK `<bang_cha>_id` ở phía `*`                                                                                                                                                  |
| Association 1 – 0..1 / 1 – 1                              | FK + `UNIQUE` ở phía navigable (hoặc phía `0..1`)                                                                                                                              |
| Association * – *                                         | Bảng trung gian `<a>_<b>` (PK ghép 2 FK)                                                                                                                                       |
| Association Class                                         | Bảng trung gian + các cột của association class                                                                                                                                |
| Composition                                               | FK `NOT NULL`, `ON DELETE CASCADE`                                                                                                                                             |
| Aggregation                                               | FK nullable, `ON DELETE SET NULL`                                                                                                                                              |
| Association có role name                                  | Tên FK = `<role>_id`                                                                                                                                                           |
| Generalization                                            | Theo chiến lược: **JOINED** (mặc định: bảng con có PK = FK tới cha) · **SINGLE_TABLE** (gộp vào bảng cha + cột `dtype`) · **TABLE_PER_CLASS** (mỗi lớp cụ thể một bảng đủ cột) |
| Class `«embeddable»` / Data Type                          | Gộp cột vào bảng chứa với tiền tố `<thuoc_tinh>_`                                                                                                                              |

### Bảng kiểu

| UML/Java/TS                        | PostgreSQL         | MySQL           | SQL Server         |
| ---------------------------------- | ------------------ | --------------- | ------------------ |
| String                             | `VARCHAR(255)`     | `VARCHAR(255)`  | `NVARCHAR(255)`    |
| Text                               | `TEXT`             | `TEXT`          | `NVARCHAR(MAX)`    |
| int / Integer / number             | `INTEGER`          | `INT`           | `INT`              |
| long / Long                        | `BIGINT`           | `BIGINT`        | `BIGINT`           |
| float / double                     | `DOUBLE PRECISION` | `DOUBLE`        | `FLOAT`            |
| Decimal / BigDecimal / Money       | `NUMERIC(19,4)`    | `DECIMAL(19,4)` | `DECIMAL(19,4)`    |
| boolean                            | `BOOLEAN`          | `TINYINT(1)`    | `BIT`              |
| Date / LocalDate                   | `DATE`             | `DATE`          | `DATE`             |
| DateTime / LocalDateTime / Instant | `TIMESTAMPTZ`      | `DATETIME(6)`   | `DATETIME2`        |
| Time                               | `TIME`             | `TIME`          | `TIME`             |
| UUID                               | `UUID`             | `CHAR(36)`      | `UNIQUEIDENTIFIER` |
| byte[] / Blob                      | `BYTEA`            | `BLOB`          | `VARBINARY(MAX)`   |
| JSON / Object / Map                | `JSONB`            | `JSON`          | `NVARCHAR(MAX)`    |

Kiểu lạ: giữ nguyên chuỗi và ghi cảnh báo trong report. Người dùng sửa được bảng kiểu (lưu theo project).

## 3. Đồng bộ (không nhân bản khi parse lại)

- Entity lưu `mappedFrom.classId`, column lưu `mappedFrom.attributeId`, relationship lưu `mappedFrom.associationId`.
- Parse lại: khớp theo các id này → chỉ **sửa** phần đã đổi; class mới → thêm; class đã xoá → đề xuất xoá (mặc định không tick).
- Cột/bảng người dùng sửa tay trên ERD được đánh dấu `manuallyEdited` → diff hiện "Giữ chỉnh sửa tay" mặc định.
- Vị trí entity cũ giữ nguyên; entity mới đặt bằng elkjs quanh vùng trống.

## 4. Sinh DDL

`erdToDdl(erd, dialect) → string`:

1. `CREATE TYPE` (enum) và `CREATE SEQUENCE`.
2. `CREATE TABLE` theo thứ tự topo (bảng không phụ thuộc trước), cột, `PRIMARY KEY`, `UNIQUE`, `CHECK`, `DEFAULT`.
3. `ALTER TABLE … ADD CONSTRAINT fk_<con>_<cha> FOREIGN KEY … REFERENCES … ON DELETE … ON UPDATE …` (tách riêng để không vướng vòng).
4. `CREATE INDEX`.
5. `CREATE VIEW`, procedure, trigger (giữ nguyên body người dùng nhập).
6. `COMMENT ON` (PostgreSQL) / `COMMENT '…'` (MySQL).

Trích dẫn tên bằng `"..."` (PostgreSQL), `` `...` `` (MySQL), `[...]` (SQL Server) khi trùng từ khoá hoặc có ký tự đặc biệt.

## 5. Test bắt buộc

Fixture class diagram UniPark+ (User, SinhVien ⟶ User, Xe, TheRFID, PhienGuiXe, GoiThang, ViDienTu, GiaoDich, ReputationEvent): kiểm tra số bảng, FK, bảng trung gian, chiến lược JOINED, DDL PostgreSQL chạy được trên Postgres thật trong CI (service container).
