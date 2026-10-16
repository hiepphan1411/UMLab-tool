# Class Diagram — palette & ký hiệu

Thứ tự palette (theo hình 2):

```
Cursor◢
Class◢ · Generalization◢ · Usage · Association◢ · N-ary Association · Association Class
Dependency◢ · Abstraction◢ · Collaboration · Model · REST Service
Note · Anchor · Constraint · Containment
| Package◢ · Diagram Overview · Generic Connector · User Story · Image · Screen Capture · Callout
  Rectangle · Oval · Polygon · Line · Text Box · Diagram Info
| Pencil · Pen · Calligraphy Tool · Connector
```

## 1. Hình (node)

### Class ◢

Flyout: **Class**, **Interface**, **Enumeration**, **Data Type**, **Primitive Type**, **Signal**.

| Biến thể       | Shape / modelKind                 | Ký hiệu                                                                                                                                                                                                                             |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class          | `cls.class` / `uml.class`         | Hình chữ nhật 3 ngăn: **tên** (đậm, giữa; stereotype `«entity»` phía trên; _nghiêng_ nếu abstract), **thuộc tính**, **phương thức**. Template: ô nét đứt nhỏ đè góc trên phải chứa tham số `T, K`. Class active: viền trái phải kép |
| Interface      | `cls.interface` / `uml.interface` | Như class, đầu ngăn tên có `«interface»`. Tuỳ chọn hiển thị **lollipop** (vòng tròn nhỏ + tên)                                                                                                                                      |
| Enumeration    | `cls.enum` / `uml.enumeration`    | `«enumeration»` + tên; ngăn thứ hai là **literals** (mỗi dòng 1 giá trị)                                                                                                                                                            |
| Data Type      | `cls.datatype` / `uml.datatype`   | `«dataType»` + tên + thuộc tính                                                                                                                                                                                                     |
| Primitive Type | `cls.primitive` / `uml.primitive` | `«primitive»` + tên, 1 ngăn                                                                                                                                                                                                         |
| Signal         | `cls.signal` / `uml.signal`       | `«signal»` + tên + thuộc tính                                                                                                                                                                                                       |

**Thuộc tính model của Class:**

```ts
{ name; stereotypes: string[]; visibility: '+'|'-'|'#'|'~'; isAbstract; isLeaf; isActive;
  templateParams: { name; type? }[];
  attributes: { id; name; type; visibility; multiplicity; default?; isStatic; isDerived; isReadOnly;
                constraints: string[] /* unique, id, ordered */; stereotypes: string[] }[];
  operations: { id; name; visibility; params: { name; type; direction: 'in'|'out'|'inout'|'return'; default? }[];
                returnType?; isStatic; isAbstract; isQuery; stereotypes: string[] }[];
  literals?: { id; name }[];      // enumeration
  documentation: string }
```

**Hiển thị:**

- Thuộc tính: `vis name : Type [mult] = default {constraints}`; `/` trước tên nếu derived; **gạch chân** nếu static.
- Phương thức: `vis name(dir p : T, …) : Return`; _nghiêng_ nếu abstract; gạch chân nếu static.
- View props: ẩn/hiện từng ngăn, ẩn kiểu dữ liệu, ẩn tham số, chỉ hiện public, tự giãn theo nội dung.

**Sửa nhanh (giống VP):** chọn class → `Alt+Shift+A` thêm thuộc tính, `Alt+Shift+O` thêm phương thức, gõ dạng `- name : String` rồi Enter. Parser ở `packages/core/src/uml/parse-member.ts`, có unit test cho các dạng: `+ getTotal() : Decimal`, `# items : Item [0..*] {ordered}`, `+ $MAX : int = 10` (`$` → static), `/age : int`.

### Các hình khác

| Công cụ           | Shape / modelKind                         | Ký hiệu                                                                                                                                                                                                         | Thuộc tính                                                |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| N-ary Association | `cls.naryAssoc` / `uml.association`       | **Hình thoi rỗng** lớn, nối bằng đường liền tới ≥ 3 class                                                                                                                                                       | name; mỗi đầu: role, multiplicity                         |
| Association Class | `cls.assocClass` / `uml.associationClass` | Một **class** nối bằng **nét đứt** tới điểm giữa một association giữa 2 class                                                                                                                                   | như Class + 2 đầu association                             |
| Collaboration     | `cls.collaboration` / `uml.collaboration` | Elip nét đứt, tên giữa; ngăn phụ liệt kê role                                                                                                                                                                   | name, roles[]                                             |
| Model             | `cls.model` / `uml.model`                 | Package có **tam giác nhỏ** cạnh tên trên tab                                                                                                                                                                   | name; container                                           |
| REST Service      | `cls.rest` / `rest.resource`              | Hình chữ nhật có icon địa cầu nhỏ góc trên phải, stereotype `«REST Resource»`; ngăn: **URI**, **Method** (GET/POST/PUT/PATCH/DELETE màu theo method), **Request** (params/body), **Response** (status + schema) | uri, method, description, requestParams[] {name, in: path | query | header | body, type, required}, requestBody (type tham chiếu class), responses[] {status, description, type} |

**Package** dùng chung (notation-common) và là container cho class.

## 2. Đường nối

| Công cụ                              | kind                               | Ký hiệu                                                                                                            | Luật                                                                              |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Generalization ◢ → Generalization    | `cls.generalization`               | Liền + **tam giác rỗng** ở cha                                                                                     | Class→Class, Interface→Interface, cùng loại; cấm vòng; cấm kế thừa class `isLeaf` |
| Generalization ◢ → Realization       | `cls.realization`                  | **Nét đứt** + tam giác rỗng                                                                                        | Class → Interface                                                                 |
| Usage                                | `cls.usage`                        | Nét đứt + mũi tên mở, `«use»`                                                                                      | Bất kỳ classifier → bất kỳ                                                        |
| Association ◢ → Association          | `cls.association`                  | Liền, không marker                                                                                                 | Classifier ↔ Classifier, cho phép self-loop                                       |
| Association ◢ → Directed Association | `cls.association` (navigable đích) | Liền + mũi tên mở ở đích                                                                                           |                                                                                   |
| Association ◢ → Aggregation          | `cls.aggregation`                  | Liền + **thoi rỗng** ở phía tổng thể                                                                               | Không cho vòng aggregation                                                        |
| Association ◢ → Composition          | `cls.composition`                  | Liền + **thoi đặc** ở phía tổng thể                                                                                | Một phần chỉ thuộc 1 composition (cảnh báo nếu nhiều)                             |
| Dependency ◢                         | `cls.dependency`                   | Nét đứt + mũi tên mở; flyout chọn stereotype: (không), `«instantiate»`, `«call»`, `«create»`, `«send»`, `«permit»` | Bất kỳ → bất kỳ                                                                   |
| Abstraction ◢                        | `cls.abstraction`                  | Nét đứt + mũi tên mở; flyout: `«abstraction»`, `«derive»`, `«refine»`, `«trace»`, `«substitute»`                   | Bất kỳ → bất kỳ                                                                   |
| Containment                          | `common.containment`               | Liền + ⊕ ở phía chứa                                                                                               | Package/Class ⊕— Class (nested class)                                             |

**Thuộc tính Association (model):**

```ts
{ name; showDirection /* ▶ cạnh tên */;
  ends: [ { classId; role; multiplicity; navigable: 'yes'|'no'|'unspecified' /* no → vẽ ✕ */;
            aggregation: 'none'|'shared'|'composite'; visibility; isOrdered; isUnique; qualifier? }, {…} ] }
```

Nhãn: tên ở giữa (kèm ▶), role + multiplicity ở 2 đầu (tự lật bên để không đè), `{ordered}` cạnh multiplicity.

## 3. Kiểm tra

- Trùng tên class trong cùng package.
- Thuộc tính/phương thức trùng tên (phương thức trùng chữ ký).
- Kiểu dữ liệu tham chiếu tới class không tồn tại (gạch chân lượn sóng, gợi ý "Tạo class").
- Class abstract không có phương thức abstract (thông tin).
- Interface có thuộc tính non-static (cảnh báo).

## 4. Tính năng thêm

- **Gợi ý kiểu khi gõ** `: ` → danh sách class trong project + kiểu cơ bản (String, int, long, double, boolean, Date, DateTime, UUID, Decimal, List<T>).
- **Tạo association từ thuộc tính:** chuột phải thuộc tính có kiểu là class khác → "Chuyển thành association".
- **Sinh ERD:** nút "Parse ORM → ERD" trên thanh công cụ (xem [orm-mapping.md](orm-mapping.md)).
- **Xuất code khung** (tuỳ chọn, P13): TypeScript class/interface, Java class.

## 5. Icon cần vẽ

`class, interface, enumeration, datatype, primitive, signal, generalization, realization, usage, association, directed-association, aggregation, composition, nary-association, association-class, dependency, abstraction, collaboration, model, rest-service`
