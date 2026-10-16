# P09 — Sơ đồ cơ sở dữ liệu (ERD) + Parse ORM

**Mục tiêu:** vẽ ERD vật lý đầy đủ, sinh ERD từ Class Diagram và xuất SQL DDL. Đặc tả: [spec/notation-erd.md](../spec/notation-erd.md), [spec/orm-mapping.md](../spec/orm-mapping.md).

## Việc cần làm

**9.1 Shape & palette:** Entity (đầu bảng, ngăn PK, icon PK/FK, N/U), View, Stored Procedures, Stored Procedure ResultSet, Triggers, Sequence + nhóm chung.

**9.2 Cột:** Inspector dạng bảng (tên, kiểu theo dialect, độ dài, PK, NN, UQ, AI, default, comment); kéo đổi thứ tự; parser `email varchar(255) unique not null`; `Alt+Shift+C`.

**9.3 Quan hệ:** One-to-One, One-to-Many (tự thêm FK), Many-to-Many (hỏi tạo bảng trung gian); identifying (liền) / non-identifying (đứt); 4 nút chọn cardinality mỗi đầu; onDelete/onUpdate; đổi PK cha → FK con cập nhật; xoá quan hệ hỏi xoá FK.

**9.4 Index, unique, check** cho entity (tab riêng trong Inspector).

**9.5 Kiểm tra** theo spec mục 3 (từ khoá SQL theo dialect).

**9.6 Parse ORM:** hàm `classToErd` + hộp thoại 3 bước (chọn class → tuỳ chọn → xem diff) + đồng bộ không nhân bản (mapping id) + giữ chỉnh sửa tay. Bật nút trên Class Diagram từ P08.

**9.7 DDL:** `erdToDdl` cho PostgreSQL/MySQL/SQL Server; hộp xem trước có highlight (Shiki hoặc Prism), Sao chép, Tải `.sql`. Tuỳ chọn: nhập DDL bằng `node-sql-parser`.

**9.8 (tuỳ chọn) Chế độ Chen:** palette khái niệm (entity, weak entity, relationship, identifying, các loại attribute, link với cardinality + tham gia toàn phần) và "Chuyển sang mô hình vật lý".

## Tiêu chí nghiệm thu

- Parse class diagram UniPark+ → ERD đúng số bảng/FK như test trong orm-mapping.md mục 5; đặt bố cục gọn (elkjs).
- Sửa class (thêm thuộc tính) → parse lại chỉ thêm 1 cột, vị trí bảng giữ nguyên.
- DDL PostgreSQL sinh ra chạy được trên Postgres thật (test CI).
- Tạo One-to-Many giữa `xe` và `phien_gui_xe` → `phien_gui_xe.xe_id` tự xuất hiện có icon FK.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/notation-erd.md, docs/spec/orm-mapping.md, docs/phases/P09-erd.md.
Phiên 1: 9.1–9.5 (editor ERD). Phiên 2: 9.6 (classToErd trong packages/core + dialog) . Phiên 3: 9.7 DDL (+9.8 nếu còn thời gian).
Mọi hàm chuyển đổi phải có unit test với fixture UniPark+.
```
