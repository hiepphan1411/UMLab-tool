# P04 — Diagram engine dùng chung

**Mục tiêu:** một engine canvas SVG đủ mạnh để mọi loại sơ đồ chỉ cần khai báo shape/connector. Đặc tả chi tiết: [spec/engine.md](../spec/engine.md).

Làm theo thứ tự, mỗi mục dừng lại cho kiểm:

## 4.1 Store & lịch sử

- Zustand store per-diagram: `views`, `connectors`, `model` (Map id → element), `selection`, `viewport`, `tool`.
- Mọi thay đổi qua `apply(recipe)` (Immer `produceWithPatches`); history 200 bước; gộp drag liên tục; Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
- Dirty tracking cho autosave P03; serialize/deserialize đúng `spec/json-format.md`.

## 4.2 Canvas & viewport

- SVG toàn màn; zoom 10–600% tại con trỏ (Ctrl+cuộn), pan (Space/chuột giữa/công cụ Hand), lưới chấm, "Vừa màn hình", minimap.
- Hit-test, hover outline, culling khi > 300 view.

## 4.3 Registry

- `registerShape`, `registerConnector`, `registerPalette(diagramType, groups)` như API trong spec.
- Inspector tự động từ zod schema: string → Input, enum → Segmented/Select, boolean → Checkbox, number → Input số, color → ô màu, array → danh sách thêm/xoá/kéo; tab "Hình dạng" (view props + style) và "Mô hình" (model data).

## 4.4 Chọn & biến đổi

- Click/Shift/marquee/Ctrl+A; 8 handle resize (tôn trọng `minSize`, `aspectLock`, `resizable`); bắt dính lưới + đường gióng; mũi tên dịch 1/10px; căn chỉnh/giãn đều; z-order; khoá; ẩn; Element Group (Ctrl+G).
- Copy/paste/duplicate (giữ `modelId` trong cùng project); Delete (xoá view) / Ctrl+Delete (xoá khỏi mô hình, có xác nhận nếu phần tử xuất hiện ở sơ đồ khác).

## 4.5 Container

- `parentId`, thả vào/ra container, con đi theo cha, `autoGrow`, highlight khi thả, lồng 10 cấp.

## 4.6 Connector

- Tạo bằng công cụ hoặc chấm nối 4 cạnh khi hover; kiểm `allow()` khi rê (con trỏ ⊘ + tooltip lý do); reconnect bằng kéo đầu mút.
- Routing orthogonal (port từ tool cũ) / straight / curved; waypoint; self-loop; nhãn kéo được theo slot; line jump tuỳ chọn.
- Thư viện marker đầy đủ bảng mục 3 trong spec/engine.md.

## 4.7 Palette kiểu VP

- Cursor trên cùng; nhóm + đường kẻ; flyout ◢ (bấm tam giác hoặc giữ 400ms); sticky tool (double-click); click-đặt, kéo-vẽ, kéo-thả; ô tìm công cụ; thu gọn chỉ icon.
- Tab dọc trái: Palette · Model Explorer (placeholder P12) · Lớp · Sơ đồ (danh sách sơ đồ project để chuyển nhanh).

## 4.8 Sửa chữ & compartment

- Inline editor theo `textRegions`; compartment list (Enter thêm dòng, Backspace xoá dòng rỗng, Tab chuyển ngăn); hook `parse/format` cho từng compartment.

## 4.9 Resource Catalog

- Nút kéo cạnh hình khi hover; thả lên hình → menu connector hợp lệ; thả chỗ trống → menu "connector → shape mới".

## 4.10 Kiểm tra & tìm kiếm

- Bảng Kiểm tra (rules đăng ký theo loại sơ đồ), Ctrl+F tìm hình, tự bố cục elkjs cho vùng chọn.

## 4.11 Xuất

- Port hộp "Xuất ảnh" từ tool cũ (PNG/JPG/SVG, tỉ lệ/chiều rộng, lề, nền, vùng chọn, xem trước) + PDF (svg2pdf.js) + sao chép ảnh vào clipboard; thumbnail 320×200 khi lưu.
- Xuất/Nhập JSON sơ đồ ngay trong editor (Thay thế / Gộp).

## 4.12 Sơ đồ thử nghiệm

- Loại tạm `playground` (chỉ dev) đăng ký 3 shape (box, circle, container) + 2 connector (arrow, dashed) để test engine độc lập với UML.

## Tiêu chí nghiệm thu

- Trên `playground`: tạo 300 hình + 400 nối, kéo mượt; undo/redo 50 bước đúng; container lồng 3 cấp; xuất PNG 2x và SVG mở được bằng trình duyệt; xuất JSON → xoá hết → nhập lại giống hệt.
- Unit test: routing orthogonal (5 cặp cạnh), hit-test, history gộp drag, parse/format compartment mẫu.
- Playwright: vẽ 2 hình, nối, undo, redo, xuất JSON.

## Prompt cho Claude Code (chia nhỏ)

```
Đọc CLAUDE.md, docs/spec/engine.md, docs/phases/P04-engine.md.
Nguồn tham khảo: docs/reference/unipark-diagram-studio.html — port các hàm autoOrtho, roundedPath, snapMove,
layoutText, buildExportSVG, rasterize, openExportImage sang TypeScript module trong features/editors/engine.
Phiên này làm P04 mục 4.1 → 4.4. Dừng lại sau 4.4, chạy test và báo cáo.
```

Phiên sau: "Tiếp P04 mục 4.5 → 4.8", rồi "P04 mục 4.9 → 4.12".
