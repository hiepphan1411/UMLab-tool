# P05 — Nhóm hình chung + port Sơ đồ kiến trúc & Gantt

**Mục tiêu:** có đủ nhóm công cụ dùng chung cho mọi sơ đồ UML, và đưa 2 tính năng của tool cũ vào hệ thống mới không mất chức năng.

## 5.1 Nhóm hình chung

- Cài toàn bộ bảng trong [spec/notation-common.md](../spec/notation-common.md): Element Group, Note, Anchor, Constraint, Containment, Allocate, Rationale, Problem, Package◢ (Package/Model/Subsystem), Diagram Overview, Generic Connector, User Story, Image, Screen Capture, Callout, Rectangle, Oval, Polygon, Line, Text Box, Diagram Info, Pencil, Pen, Calligraphy Tool (`perfect-freehand`), Connector.
- Vẽ icon tương ứng trong `packages/uml-icons`.
- Export hằng `COMMON_PALETTE_GROUPS` để các sơ đồ UML ghép vào cuối palette.

## 5.2 Sơ đồ kiến trúc (`architecture`)

Port đầy đủ từ tool cũ:

- Shape: `arch.group` (nhóm/khung nền màu, tiêu đề), `arch.card` (thẻ icon trái/trên, tiêu đề có `**đậm**`, mô tả, nhiều icon, preset màu), `arch.icon`, cộng các hình chung.
- Thư viện icon: lucide (~2.100) + simple-icons (~130 logo công nghệ), tìm kiếm có từ khoá tiếng Việt; kéo icon thả lên thẻ để thay, Shift để thêm.
- Preset nhóm (6 màu) và preset thẻ như tool cũ.
- Mặc định palette: Cursor | Nhóm/Khung | Thẻ icon trái · Thẻ icon trên · Cơ sở dữ liệu · Chữ nhật · Elip · Hình thoi · Văn bản | Icon | nhóm chung.
- Mẫu "Kiến trúc UniPark+" (từ fixture) khi tạo sơ đồ mới.

## 5.3 Gantt (`gantt`)

Editor riêng (không dùng canvas engine), port toàn bộ:

- Chia Ngày/Tuần/Tháng; vạch Hôm nay; cuối tuần; cột hiển thị tuỳ chọn (Sprint, Giai đoạn, Bắt đầu, Kết thúc, Số ngày, Phụ trách, Trạng thái, Tiến độ).
- Kéo thân/đầu thanh, kéo tam giác % ; ô Tiến độ bấm mở popover cập nhật nhanh; checklist hạng mục tự tính %; mốc (milestone); icon cho dòng.
- Trạng thái tự động 6 loại + đặt tay; thẻ KPI; tooltip **khi bấm**; dán bảng từ Excel; thêm sprint/module; Ngày báo cáo.
- Inspector như tool cũ; xuất ảnh có tiêu đề + chú thích; xuất/nhập JSON (`data` theo cấu trúc cũ).
- Một sơ đồ Gantt = một bảng (sprint hoặc module); tạo mới cho chọn mẫu "Theo sprint" / "Theo module".

## Tiêu chí nghiệm thu

- Nhập `unipark-plus.json` cũ → sơ đồ kiến trúc trông giống bản cũ (so ảnh xuất PNG bằng mắt), 2 Gantt đủ dữ liệu.
- Mọi công cụ nhóm chung đặt được, sửa được trong Inspector, xuất ảnh đúng.
- Gantt: kéo thanh, cập nhật % qua popover, checklist, dán Excel hoạt động như tool cũ.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/notation-common.md, docs/phases/P05-common-architecture-gantt.md.
Phiên này: 5.1 nhóm hình chung + icon. Phiên sau: 5.2 port sơ đồ kiến trúc. Phiên sau nữa: 5.3 port Gantt.
Nguồn port: docs/reference/unipark-diagram-studio.html (các hàm renderEl, renderEdge, renderGantt, gLeftSVG, gRightSVG,
showTip, openProgPop, openPasteExcel, buildGanttExportSVG). Giữ nguyên hành vi, viết lại bằng React + TS.
```
