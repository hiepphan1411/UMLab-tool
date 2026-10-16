# Định dạng JSON `umlab`

Một định dạng duy nhất cho mọi loại sơ đồ. Schema zod đặt ở `packages/core/src/format/`.

## 1. File một sơ đồ

```jsonc
{
  "format": "umlab",
  "schemaVersion": 1,
  "kind": "diagram",
  "exportedAt": "2026-10-16T10:00:00Z",
  "diagram": {
    "id": "dg_8f2k",
    "type": "class", // architecture|gantt|usecase|usecase-spec|class|erd|activity|sequence
    "name": "Class Diagram - Payment",
    "canvas": { "background": "#FFFFFF", "grid": true, "notation": "uml" },
    "views": [/* View[] */],
    "connectors": [/* Connector[] */],
    "data": null, // dành cho loại không phải canvas: gantt, usecase-spec
  },
  "model": [/* ModelElement[] được view tham chiếu, để file tự đủ */],
}
```

### View (một hình trên canvas)

```jsonc
{
  "id": "v_01",
  "shape": "uml.class", // khoá trong shape registry
  "modelId": "m_vehicle", // null với hình không mang ngữ nghĩa
  "x": 120,
  "y": 80,
  "w": 220,
  "h": 140,
  "z": 3,
  "parentId": null, // container chứa nó (package, system, swimlane, fragment…)
  "props": {}, // thuộc tính chỉ thuộc view (ẩn compartment, hiện stereotype…)
  "style": { "fill": "#FFFFFF", "stroke": "#4A6FA5", "strokeWidth": 1.5, "fontSize": 13 },
  "locked": false,
  "hidden": false,
}
```

### Connector

```jsonc
{
  "id": "c_01",
  "kind": "uml.association", // khoá trong connector registry
  "modelId": "m_assoc_1", // association, generalization… là phần tử mô hình; anchor thì null
  "source": { "viewId": "v_01", "side": "right", "t": 0.5 },
  "target": { "viewId": "v_02", "side": "left", "t": 0.5 },
  "routing": "orthogonal", // orthogonal|straight|curved|manual
  "waypoints": [{ "x": 300, "y": 120 }],
  "labels": [{ "role": "name", "text": "owns", "pos": 0.5, "dx": 0, "dy": -10 }],
  "props": {},
  "style": { "stroke": "#1F2937", "strokeWidth": 1.4 },
}
```

Với sequence diagram, `source/target` có thêm `y` (toạ độ theo thời gian trên lifeline) thay cho `side/t`.

### ModelElement

```jsonc
{
  "id": "m_vehicle",
  "kind": "uml.class",
  "name": "Vehicle",
  "data": {
    "stereotypes": ["entity"],
    "isAbstract": false,
    "attributes": [
      {
        "id": "a1",
        "name": "plate",
        "type": "String",
        "visibility": "-",
        "multiplicity": "1",
        "isStatic": false,
        "default": null,
        "constraints": ["unique"],
      },
    ],
    "operations": [
      {
        "id": "o1",
        "name": "checkIn",
        "visibility": "+",
        "params": [{ "name": "gateId", "type": "String", "direction": "in" }],
        "returnType": "Session",
        "isAbstract": false,
        "isStatic": false,
      },
    ],
  },
}
```

Mỗi `kind` có schema `data` riêng, định nghĩa trong `spec/notation-*.md` (cột "Thuộc tính").

## 2. File cả project

```jsonc
{
  "format": "umlab",
  "schemaVersion": 1,
  "kind": "project",
  "project": { "id": "p_1", "name": "UniPark+", "description": "", "color": "#2E62E6", "icon": "car" },
  "folders": [{ "id": "f_1", "parentId": null, "name": "Phân tích", "order": 0 }],
  "diagrams": [
    { "id": "dg_1", "folderId": "f_1", "type": "usecase", "name": "...", "views": [], "connectors": [], "data": null },
  ],
  "model": [/* toàn bộ ModelElement */],
}
```

## 3. Quy tắc nhập (import)

| Tình huống                                   | Hành vi                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| File `kind: diagram` vào một project         | Tạo sơ đồ mới trong thư mục đang chọn. Model element trùng `id` đã có: hỏi **Dùng lại / Tạo bản sao**. |
| File `kind: diagram` vào chính sơ đồ đang mở | Hỏi **Thay thế / Gộp thêm** (gộp: dịch toạ độ để không đè).                                            |
| File `kind: project` ở trang chủ             | Tạo project mới, sinh lại toàn bộ id để không đụng dữ liệu cũ.                                         |
| `type` khác loại sơ đồ đang mở               | Báo lỗi rõ: "Tệp này là Class Diagram, không nhập được vào Sequence Diagram."                          |
| Sai schema                                   | Liệt kê tối đa 5 lỗi zod theo đường dẫn, ví dụ `views[3].w: phải là số`.                               |
| `schemaVersion` cũ hơn                       | Chạy chuỗi migrate trong `packages/core/src/format/migrations/`.                                       |

## 4. Tương thích file cũ (UniPark+ Diagram Studio)

File có `"format": "unipark-diagram"` (version 1 hoặc 2) được nhận ở cả trang chủ và dashboard:

- `elements` + `edges` → 1 sơ đồ `architecture`:
  - `group` → `arch.group`, `node` → `arch.card`, `text` → `common.textbox`, `shape` → `common.rectangle|oval|polygon`, `icon` → `arch.icon`.
  - `edge.from/to {id, side, t}` → `connector.source/target {viewId, side, t}`; `points` → `waypoints`; `dash/arrowStart/arrowEnd/label` giữ nguyên trong `props`/`labels`.
- `gantt` → 1 sơ đồ `gantt` tên "Tiến độ theo sprint"; `moduleGantt` → 1 sơ đồ `gantt` tên "Tiến độ theo module". `data` giữ nguyên cấu trúc `{title, reportDate, scale, weekends, columns, tasks}`.
- Hàm `migrateLegacyUnipark(json) → ProjectBundle` có unit test với chính file `unipark-plus.json`.

## 5. Xuất (export)

- **Xuất JSON sơ đồ:** nút trên thanh công cụ editor và menu ⋯ trong danh sách. Tên tệp: `<ten-so-do>.umlab.json`.
- **Xuất JSON project:** menu ⋯ của project ở trang chủ. Tên tệp: `<ten-project>.umlab-project.json`.
- Khi xuất sơ đồ, đính kèm các ModelElement mà sơ đồ tham chiếu (để mở được ở project khác).
- Thứ tự key ổn định, thụt lề 2, bỏ giá trị bằng mặc định (giống tool hiện tại) để file gọn và dễ diff trên Git.
