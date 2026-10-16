# Nhóm công cụ dùng chung

Các công cụ này xuất hiện ở cuối palette của **mọi** sơ đồ UML (Use Case, Class, Activity, Sequence, ERD), giống Visual Paradigm. Cài một lần trong `features/editors/shapes/common/`, mỗi sơ đồ chọn bật nhóm nào.

Quy ước cột: **Ký hiệu** là cách vẽ; **Thuộc tính** là field trong Inspector; **Hành vi** là luật nối, container, tương tác.

## Nhóm A — Chú thích & ràng buộc

| Công cụ       | Shape/kind           | Ký hiệu                                                                                  | Thuộc tính                                  | Hành vi                                                                                                     |
| ------------- | -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Element Group | `common.group`       | Không có hình riêng khi in; trên canvas hiện khung nét đứt mờ quanh các phần tử khi chọn | name                                        | Gom các phần tử để chọn/di chuyển cùng nhau (Ctrl+G tạo, Ctrl+Shift+G bỏ). Lưu `groupId` trên view.         |
| Note          | `common.note`        | Hình chữ nhật góc trên phải gấp mép, nền vàng nhạt `#FFF8D6`                             | text (rich: đậm/nghiêng/danh sách), màu nền | Nối với phần tử bằng Anchor.                                                                                |
| Anchor        | `common.anchor`      | Đường **chấm/nét đứt** mảnh, không mũi tên                                               | —                                           | Chỉ nối Note/Constraint/Rationale/Problem/Callout ↔ bất kỳ phần tử.                                         |
| Constraint    | `common.constraint`  | Chữ trong ngoặc nhọn `{ … }`, không viền (tuỳ chọn viền note)                            | specification (text), language (OCL/Text)   | Nối bằng Anchor tới phần tử bị ràng buộc; có thể nối 2 đường (ví dụ `{xor}` giữa 2 association).            |
| Containment   | `common.containment` | Đường liền, đầu phía phần tử chứa có **⊕** (circle-plus)                                 | —                                           | Biểu thị phần tử nằm trong không gian tên của phần tử kia (package ⊕— class). Cập nhật `owner` trong model. |

## Nhóm B — Yêu cầu (SysML)

| Công cụ   | Shape/kind         | Ký hiệu                                         | Thuộc tính        | Hành vi                                                  |
| --------- | ------------------ | ----------------------------------------------- | ----------------- | -------------------------------------------------------- |
| Allocate  | `common.allocate`  | Đường **nét đứt** mũi tên mở, nhãn `«allocate»` | name, description | Nối hai phần tử bất kỳ (phân bổ chức năng → thành phần). |
| Rationale | `common.rationale` | Note có nhãn `«rationale»` ở đầu                | text              | Nối bằng Anchor.                                         |
| Problem   | `common.problem`   | Note có nhãn `«problem»` ở đầu, viền đỏ nhạt    | text, severity    | Nối bằng Anchor.                                         |

## Nhóm C — Tổ chức & tài liệu

| Công cụ           | Shape/kind               | Ký hiệu                                                                               | Thuộc tính                                                                       | Hành vi                                                                                                                               |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Package ◢         | `common.package`         | Hình chữ nhật có **tab** nhỏ góc trên trái chứa tên; hoặc tên ở giữa khi rỗng         | name, stereotype, visibility                                                     | Container (accepts `*`), autoGrow. Biến thể flyout: **Package**, **Model** (tab có icon tam giác nhỏ), **Subsystem** (`«subsystem»`). |
| Diagram Overview  | `common.diagramOverview` | Khung có thanh tiêu đề tên sơ đồ, bên trong là **thumbnail sống** của sơ đồ khác      | diagramId (chọn từ project)                                                      | Double-click mở sơ đồ đó. Thumbnail tự cập nhật.                                                                                      |
| Generic Connector | `common.connector`       | Đường liền, chọn được marker 2 đầu                                                    | line style, markers, label                                                       | Nối bất kỳ, không mang ngữ nghĩa.                                                                                                     |
| User Story        | `common.userStory`       | Thẻ bo góc, dải màu trái, tiêu đề + "Là [vai trò], tôi muốn [mục tiêu], để [lợi ích]" | role, goal, benefit, acceptanceCriteria[], priority, points, status              | Nối Anchor/Generic tới Use Case. Có tab tiêu chí chấp nhận (checklist).                                                               |
| Image             | `common.image`           | Ảnh (PNG/JPG/SVG)                                                                     | src (upload), fit (contain/cover), opacity                                       | Upload lưu vào bảng `Asset` (P13) hoặc base64 ≤ 1 MB ở P05.                                                                           |
| Screen Capture    | `common.screenCapture`   | Như Image, có viền mảnh và nhãn nguồn                                                 | src, caption                                                                     | Lấy ảnh bằng `navigator.mediaDevices.getDisplayMedia` (chụp một khung hình) hoặc dán từ clipboard (Ctrl+V).                           |
| Callout           | `common.callout`         | Bong bóng hội thoại có đuôi nhọn; kéo được điểm đuôi                                  | text, tail point                                                                 |                                                                                                                                       |
| Rectangle         | `common.rectangle`       | Hình chữ nhật, bo góc tuỳ chọn                                                        | text, fill, stroke, radius, dash                                                 |                                                                                                                                       |
| Oval              | `common.oval`            | Elip                                                                                  | text, fill, stroke                                                               |                                                                                                                                       |
| Polygon           | `common.polygon`         | Đa giác đều n cạnh (3–12), hoặc tự vẽ điểm                                            | sides, rotation, points                                                          | Chế độ "sửa đỉnh" để kéo từng đỉnh.                                                                                                   |
| Line              | `common.line`            | Đoạn thẳng tự do (không gắn hình)                                                     | stroke, width, dash, markers                                                     | Kéo 2 đầu.                                                                                                                            |
| Text Box          | `common.textbox`         | Chữ tự do, không viền                                                                 | text (rich), size, weight, align                                                 | Tự giãn chiều cao.                                                                                                                    |
| Diagram Info      | `common.diagramInfo`     | Bảng 2 cột                                                                            | Tự điền: Project, Sơ đồ, Tác giả, Ngày tạo, Cập nhật, Phiên bản; thêm dòng tuỳ ý | Tự cập nhật khi lưu.                                                                                                                  |

## Nhóm D — Vẽ tay

| Công cụ          | Shape/kind             | Ký hiệu                                             | Thuộc tính                  | Hành vi                                                                      |
| ---------------- | ---------------------- | --------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| Pencil           | `common.pencil`        | Nét vẽ tay tự do (polyline đã làm mượt)             | stroke, width               | Ghi điểm khi kéo chuột, làm mượt bằng thuật toán Chaikin/RDP.                |
| Pen              | `common.pen`           | Đường bezier                                        | stroke, width, fill, closed | Bấm từng điểm, kéo để tạo tay cầm; Enter kết thúc, bấm điểm đầu để khép kín. |
| Calligraphy Tool | `common.calligraphy`   | Nét bút thư pháp: độ dày thay đổi theo tốc độ/hướng | color, min/max width        | Dùng `perfect-freehand` để sinh polygon nét.                                 |
| Connector        | `common.freeConnector` | Đường gấp khúc vuông góc tự do nối 2 hình bất kỳ    | markers, label              | Giống Generic Connector nhưng mặc định orthogonal.                           |

## Icon cần vẽ (packages/uml-icons)

`cursor, element-group, note, anchor, constraint, containment, allocate, rationale, problem, package, model, subsystem, diagram-overview, generic-connector, user-story, image, screen-capture, callout, rectangle, oval, polygon, line, text-box, diagram-info, pencil, pen, calligraphy, connector`

Phong cách icon: 16×16, nét 1.25px, màu chính `#2E62E6` cho phần tử UML, `#64748B` cho đường/hình chung, nền ô tô màu nhạt `#E7EEFD` cho hình đặc (giống cảm giác palette VP nhưng vẽ mới hoàn toàn).
