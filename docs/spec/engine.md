# Diagram engine — đặc tả

Engine dùng chung cho mọi sơ đồ dạng canvas. Mỗi loại sơ đồ chỉ khai báo shape, connector, palette và luật nối.

## 1. Shape registry

```ts
// apps/web/src/features/editors/engine/registry.ts
export interface ShapeDef<P = unknown, M = unknown> {
  type: string; // 'uml.class', 'act.action', 'common.note'
  label: string; // tên hiển thị tiếng Việt/Anh trên palette
  icon: string; // khoá trong packages/uml-icons
  modelKind?: string; // nếu có → tạo ModelElement khi thả vào canvas
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  resizable?: boolean | 'horizontal' | 'vertical';
  aspectLock?: boolean; // Actor, Initial Node
  container?: { accepts: string[] | '*'; autoGrow?: boolean; clipChildren?: boolean };
  propsSchema: ZodType<P>; // props của view → sinh Inspector tự động
  modelSchema?: ZodType<M>; // data của ModelElement → Inspector tab "Mô hình"
  defaultProps: P;
  defaultModel?: M;
  render: (ctx: RenderCtx<P, M>) => JSX.Element; // trả về <g> SVG
  ports?: (view: View) => Port[]; // mặc định: 4 cạnh, t tuỳ ý
  textRegions?: (view: View, model: M) => TextRegion[]; // vùng sửa chữ khi double-click
  compartments?: CompartmentDef[]; // class, use case (extension points), entity
  measure?: (props: P, model: M) => { w?: number; h?: number }; // tự giãn theo nội dung
  catalog?: CatalogItem[]; // Resource Catalog (mục 6)
  inspector?: React.FC<InspectorProps<P, M>>; // ghi đè Inspector tự động khi cần
}
```

## 2. Connector registry

```ts
export interface ConnectorDef {
  kind: string; // 'uml.include'
  label: string;
  icon: string;
  modelKind?: string;
  line: 'solid' | 'dashed' | 'dotted';
  start: MarkerKind;
  end: MarkerKind; // mục 3
  stereotype?: string; // hiển thị «include», «extend», «allocate»
  defaultRouting: 'orthogonal' | 'straight' | 'curved';
  labels?: LabelSlot[]; // name, multiplicity đầu/cuối, role, guard…
  allow: (src: ViewCtx, tgt: ViewCtx) => true | string; // string = lý do không hợp lệ (hiện tooltip đỏ)
  selfLoop?: boolean;
  propsSchema: ZodType;
  defaultProps: unknown;
}
```

## 3. Marker (đầu mút đường nối)

Vẽ bằng SVG path, kích thước tỉ lệ theo `strokeWidth`, màu theo `stroke`.

| Mã                                                                               | Hình                 | Dùng cho                                                                                      |
| -------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `none`                                                                           | —                    | Association, Anchor                                                                           |
| `arrow-open`                                                                     | mũi tên 2 nét `>`    | Dependency, Include, Extend, Navigable association, Async message, Reply, Control/Object Flow |
| `arrow-filled`                                                                   | tam giác đặc         | Synchronous message                                                                           |
| `triangle-hollow`                                                                | tam giác rỗng        | Generalization, Realization                                                                   |
| `diamond-hollow`                                                                 | thoi rỗng            | Aggregation                                                                                   |
| `diamond-filled`                                                                 | thoi đặc             | Composition                                                                                   |
| `circle-plus`                                                                    | tròn có dấu +        | Containment (đặt ở đầu phần tử chứa)                                                          |
| `dot-filled`                                                                     | chấm đặc             | Found message (đầu), Lost message (cuối)                                                      |
| `cross-x`                                                                        | dấu X                | (dùng cho destruction trên lifeline)                                                          |
| `lightning`                                                                      | tia sét giữa đường   | Exception Handler, Interrupting edge                                                          |
| `cf-one`, `cf-many`, `cf-zero-one`, `cf-one-many`, `cf-zero-many`, `cf-one-only` | crow's foot          | ERD                                                                                           |
| `half-arrow`                                                                     | nửa mũi tên          | (tuỳ chọn) message async kiểu cũ                                                              |
| `socket` / `lollipop`                                                            | nửa vòng / tròn rỗng | Interface required/provided (Class)                                                           |

## 4. Palette (thanh công cụ trái, phong cách VP)

- Trên cùng là **Cursor** (công cụ chọn). Các nhóm ngăn bằng đường kẻ, đúng thứ tự trong `spec/notation-*.md`.
- Mục có biến thể hiển thị **tam giác nhỏ ◢** ở góc phải. Bấm vào tam giác (hoặc nhấn giữ 400ms) mở **flyout** chọn biến thể; biến thể vừa chọn trở thành mặc định của mục đó.
- **Đặt hình:** bấm công cụ rồi bấm lên canvas (kích thước mặc định), hoặc bấm–kéo để vẽ theo kích thước, hoặc kéo–thả từ palette.
- **Đặt đường nối:** bấm công cụ connector, kéo từ hình nguồn sang hình đích. Khi rê qua hình đích không hợp lệ, con trỏ đổi thành ⊘ kèm lý do.
- **Giữ công cụ:** bấm đúp công cụ để giữ (sticky), Esc để thoát. Mặc định: dùng xong quay về Cursor.
- Ô tìm kiếm công cụ trên đầu palette (gõ "fork" ra Fork Node).
- Palette có thể thu gọn chỉ còn icon (tooltip tên).
- Thanh tab dọc bên trái palette (giống VP): **Palette**, **Model Explorer** (P12), **Lớp**, **Sơ đồ trong project** (điều hướng nhanh).

## 5. Container & lồng nhau

- View có `container` nhận con: thả hình vào vùng container → set `parentId`; kéo container → con đi theo; kéo con ra ngoài → bỏ `parentId`.
- `autoGrow`: container tự nới khi con vượt biên (System boundary, Package, Swimlane, Combined Fragment, Structured Activity Node).
- Lồng nhiều cấp, giới hạn 10 cấp. Highlight viền container khi đang thả vào.
- Swimlane là container đặc biệt chia làn (mục trong notation-activity.md).

## 6. Resource Catalog (tạo nhanh như VP)

Rê chuột lên một hình, hiện một nút nhỏ ở cạnh phải. Kéo nút đó ra:

- thả lên hình có sẵn → hiện menu các connector hợp lệ giữa 2 hình;
- thả ra chỗ trống → hiện menu dạng "Include → Use Case", "Extend → Use Case", "Association → Actor"… và tạo luôn cả hình mới lẫn đường nối.

Danh sách mục cho từng shape khai báo ở `ShapeDef.catalog`, xem cột "Catalog" trong file notation.

## 7. Sửa chữ & compartment

- Double-click vùng chữ → ô nhập nổi (textarea tự giãn) đúng vị trí, cùng font. Enter xác nhận (Shift+Enter xuống dòng), Esc huỷ.
- Compartment dạng danh sách (attributes, operations, extension points, columns): mỗi dòng là một item. Trong khi sửa: Enter tạo dòng mới, Backspace ở dòng rỗng xoá dòng, Tab/Shift+Tab lên/xuống compartment. Chuỗi được **parse** (ví dụ `- plate : String [1] = "" {unique}` → visibility, name, type, multiplicity, default, constraints) và hiển thị lại theo format chuẩn.
- Nhấp chuột phải compartment → "Thêm thuộc tính", "Thêm phương thức", "Ẩn compartment".

## 8. Lịch sử, chọn, bố cục

- Undo/redo bằng Immer patches, tối đa 200 bước, gộp thao tác kéo liên tục thành 1 bước.
- Chọn: click, Shift+click, kéo vùng, Ctrl+A; căn trái/giữa/phải/trên/dưới, giãn đều, cùng rộng/cao; đưa lên/xuống lớp.
- Lưới 10px + đường gióng hồng (như tool cũ); giữ Alt để tắt bắt dính.
- Zoom 10–600% (Ctrl+cuộn), pan (Space+kéo, chuột giữa), minimap góc dưới phải, "Vừa màn hình" (Shift+1).
- Tìm trong sơ đồ (Ctrl+F): nhảy tới hình có tên khớp.
- Copy/paste giữa các sơ đồ cùng project (giữ `modelId` → cùng phần tử) và khác project (tạo bản sao).
- Tự bố cục (elkjs) cho vùng chọn hoặc cả sơ đồ: hướng trên-xuống / trái-phải.

## 9. Định tuyến đường nối

- Port từ tool cũ: orthogonal có bo góc, straight, thêm `curved` (bezier).
- Waypoint: double-click đường để thêm, double-click điểm để xoá, kéo đoạn thẳng để dời cả đoạn.
- Self-loop: tự vẽ vòng ở góc trên phải.
- Nhãn kéo được; nhãn multiplicity/role bám đầu mút, tự lật phía để không đè đường.
- Đường cắt nhau: tuỳ chọn "nhảy cầu" (line jump) như VP.

## 10. Kiểm tra mô hình

Bảng "Kiểm tra" (icon ⚠ trên thanh công cụ) liệt kê cảnh báo do từng loại sơ đồ khai báo, bấm vào để nhảy tới hình. Ví dụ: Use case chưa nối actor; Activity thiếu Initial Node; Decision có nhánh thiếu guard; Class trùng tên; Entity không có khoá chính.

## 11. Xuất

- PNG/JPG/SVG với hộp xem trước (port từ tool cũ: tỉ lệ 1–4x hoặc theo chiều rộng, lề, nền, vùng chọn).
- Sao chép ảnh vào clipboard (`ClipboardItem` PNG).
- PDF (một trang, khổ A4/A3 ngang/dọc, tự co) bằng `svg2pdf.js` + `jspdf`.
- JSON (xem `json-format.md`).
- Thumbnail SVG 320×200 sinh tự động khi lưu, dùng cho danh sách sơ đồ.

## 12. Hiệu năng

- 1.000 view + 1.500 connector vẫn kéo mượt (≥ 50 fps trên laptop phổ thông).
- Chỉ render view nằm trong viewport (culling) khi số view > 300.
- Đo chữ bằng canvas `measureText` có cache (như tool cũ).
