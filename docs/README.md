# UMLab — Kế hoạch xây dựng hệ thống

> Bộ tài liệu này dùng để giao việc cho **Claude Code** xây UMLab theo từng phase.
> Mỗi phase là một file trong `phases/`, có danh sách việc, tiêu chí nghiệm thu và một prompt mẫu để dán vào Claude Code.

## 1. UMLab là gì

UMLab là công cụ web để vẽ và quản lý các mô hình phân tích thiết kế phần mềm trong một dự án. Người dùng đăng nhập, tạo project, sắp xếp sơ đồ theo cây thư mục, rồi vẽ:

| Loại                      | Mã `type`      | Ghi chú                                                  |
| ------------------------- | -------------- | -------------------------------------------------------- |
| Sơ đồ kiến trúc           | `architecture` | Đã có (UniPark+ Diagram Studio), port sang hệ thống mới  |
| Biểu đồ Gantt             | `gantt`        | Đã có (theo sprint + theo module), port sang             |
| Use Case Diagram          | `usecase`      | Đủ palette như Visual Paradigm (hình 1)                  |
| Đặc tả Use Case           | `usecase-spec` | Biểu mẫu đặc tả gắn với từng use case                    |
| Activity Diagram          | `activity`     | Vẽ tay hoặc **sinh tự động từ đặc tả use case** (hình 3) |
| Sequence Diagram          | `sequence`     | Vẽ tay hoặc **sinh tự động từ đặc tả use case** (hình 4) |
| Class Diagram             | `class`        | Đủ palette như Visual Paradigm (hình 2)                  |
| Sơ đồ cơ sở dữ liệu (ERD) | `erd`          | Vẽ tay hoặc **parse ORM từ class diagram**, xuất SQL DDL |

Mọi sơ đồ đều **nhập/xuất JSON** được (từng sơ đồ và cả project), **xuất ảnh** PNG/JPG/SVG có xem trước, giữ phong cách giao diện hiện tại (sáng/tối, Be Vietnam Pro, accent xanh `#2E62E6`).

## 2. Phạm vi "giống Visual Paradigm"

**Làm đủ:**

- Toàn bộ công cụ trên palette của 5 loại sơ đồ UML trong ảnh chụp, kể cả các nhánh con (mục có dấu ◢ trong VP), nhóm công cụ chung (Note, Anchor, Constraint, Package, User Story, Callout, Pencil, Pen…).
- Hành vi mô hình hoá cốt lõi: tách **model element** và **view** (một class xuất hiện ở nhiều sơ đồ vẫn là một), Model Explorer, kiểm tra nối hợp lệ, "Resource Catalog" (rê chuột lên hình → nút tạo nhanh phần tử nối tiếp), compartment, stereotype, multiplicity, đánh số message tự động.

**Không làm (ngoài phạm vi):** Teamwork Server, code engineering đầy đủ (round-trip Java/C#), Report Composer, BPMN/SysML ngoài các mục Allocate/Rationale/Problem có trên palette.

**Bản quyền:** ký hiệu UML là chuẩn mở của OMG nên được phép cài đặt. Nhưng **icon, hình ảnh và giao diện của Visual Paradigm thuộc bản quyền của họ**: không chép file icon, ảnh chụp hay tên thương hiệu VP vào sản phẩm. Toàn bộ icon palette được **vẽ lại bằng SVG** theo ký hiệu UML (xem `spec/notation-*.md`).

## 3. Tech stack

| Tầng          | Lựa chọn                                                      | Lý do                                                                                                   |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Monorepo      | pnpm workspaces                                               | Nhẹ, đủ cho 2 app + 2 package                                                                           |
| Frontend      | React 18, TypeScript, Vite, TailwindCSS, React Router 6       | Hệ sinh thái mạnh cho editor; bạn đã quen React                                                         |
| State editor  | Zustand + Immer (patches cho undo/redo)                       | Undo/redo rẻ, không re-render toàn cây                                                                  |
| Data fetching | TanStack Query                                                | Cache, autosave, optimistic update                                                                      |
| Form          | react-hook-form + zod                                         | Dùng chung schema zod với backend                                                                       |
| Canvas        | **SVG engine tự viết** (port từ tool hiện tại)                | Ký hiệu UML đặc thù (lifeline, fragment, swimlane, pin) cần toàn quyền điều khiển; React Flow không hợp |
| Auto layout   | elkjs                                                         | Bố cục sơ đồ sinh tự động (activity, sequence, ERD)                                                     |
| Icon UI       | lucide-react                                                  | Như tool hiện tại                                                                                       |
| Icon UML      | `packages/uml-icons` tự vẽ 16×16                              | Không dùng asset VP                                                                                     |
| Backend       | NestJS 10, Prisma, PostgreSQL 16                              | Trùng stack UniPark+                                                                                    |
| Auth          | JWT access 15 phút + refresh 7 ngày (httpOnly cookie), argon2 |                                                                                                         |
| Xuất file     | SVG→PNG/JPG (như hiện tại), `docx` (đặc tả UC), SQL DDL       |                                                                                                         |
| Test          | Vitest (core, web), Jest (api), Playwright (E2E)              |                                                                                                         |
| Hạ tầng       | Docker Compose: postgres, api, web                            |                                                                                                         |

## 4. Cấu trúc repo

```
umlab/
├─ apps/
│  ├─ web/                 # React app
│  │  └─ src/
│  │     ├─ app/           # router, layout, providers
│  │     ├─ features/
│  │     │  ├─ auth/  projects/  workspace/
│  │     │  └─ editors/
│  │     │     ├─ engine/          # canvas, selection, connectors, history, export
│  │     │     ├─ shapes/common/   # Note, Anchor, Package, Callout, Pencil…
│  │     │     ├─ architecture/  gantt/  usecase/  usecase-spec/
│  │     │     └─ class/  erd/  activity/  sequence/
│  │     └─ ui/            # button, dialog, tree, inspector controls
│  └─ api/                 # NestJS
│     └─ src/modules/ auth/ users/ projects/ folders/ diagrams/ model/
├─ packages/
│  ├─ core/                # TS thuần, không phụ thuộc React: types, zod schema JSON,
│  │                       # migrate legacy, generators (spec→activity, spec→sequence),
│  │                       # orm (class→erd), ddl
│  └─ uml-icons/           # SVG icon 16×16 cho palette
├─ docs/                   # chính bộ tài liệu này + reference/
└─ docker-compose.yml
```

## 5. Mô hình dữ liệu (Prisma)

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  tokenVersion Int       @default(0)       // tăng khi đổi mật khẩu/đăng xuất mọi nơi
  createdAt    DateTime  @default(now())
  projects     Project[]
}

model Project {
  id          String   @id @default(cuid())
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name        String
  description String   @default("")
  color       String   @default("#2E62E6")
  icon        String   @default("folder-kanban")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  folders     Folder[]
  diagrams    Diagram[]
  model       ModelElement[]
}

model Folder {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentId  String?
  parent    Folder?  @relation("tree", fields: [parentId], references: [id], onDelete: Cascade)
  children  Folder[] @relation("tree")
  name      String
  order     Int      @default(0)
  diagrams  Diagram[]
}

model Diagram {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  folderId    String?
  folder      Folder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  type        String   // architecture|gantt|usecase|usecase-spec|class|erd|activity|sequence
  name        String
  order       Int      @default(0)
  content     Json     // views + connectors (xem spec/json-format.md)
  thumbnail   String?  // SVG thu nhỏ, sinh khi lưu
  version     Int      @default(1) // optimistic locking
  generatedFrom Json?  // {sourceDiagramId, sourceVersion, generator}
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([projectId, type])
}

model ModelElement {           // phần tử mô hình dùng chung giữa các sơ đồ
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  kind      String   // uml.class, uml.usecase, uml.actor, erd.entity, ...
  name      String
  data      Json     // thuộc tính ngữ nghĩa (attributes, operations, columns, spec…)
  updatedAt DateTime @updatedAt
  @@index([projectId, kind])
}
```

**Model và view (giống VP):** một phần tử mô hình (ví dụ class `Vehicle`) nằm trong `ModelElement`. Mỗi sơ đồ chỉ lưu **view**: vị trí, kích thước, style, và `modelId` trỏ tới phần tử. Xoá khỏi sơ đồ (Delete) chỉ xoá view; "Xoá khỏi mô hình" (Ctrl+Delete) xoá phần tử và mọi view. Các phần tử không mang ngữ nghĩa (Rectangle, Callout, Pencil…) chỉ có view.

## 6. Luồng màn hình

```
/login ─► /register
   │ (đăng nhập thành công)
   ▼
/projects                       Trang chủ: lưới project, tạo/sửa/xoá/nhân bản, nhập project JSON
   │ (chọn project)
   ▼
/p/:projectId                   Dashboard project: cây thư mục bên trái;
   │                            nội dung chính: lưới "Tạo sơ đồ mới" (8 loại) + danh sách sơ đồ
   │                            chuyển xem: [Cây thư mục] | [Theo loại] | [Gần đây]
   ▼
/p/:projectId/d/:diagramId      Editor theo loại sơ đồ (palette trái, canvas, inspector phải)
```

## 7. Lộ trình

| Phase                                          | Nội dung                                                        | Phụ thuộc | Ước lượng phiên Claude Code |
| ---------------------------------------------- | --------------------------------------------------------------- | --------- | --------------------------- |
| [P00](phases/P00-setup.md)                     | Khởi tạo monorepo, design tokens, logo, CI                      | —         | 1                           |
| [P01](phases/P01-auth.md)                      | Đăng ký, đăng nhập, bảo vệ route                                | P00       | 1–2                         |
| [P02](phases/P02-projects.md)                  | Trang chủ: quản lý project                                      | P01       | 1                           |
| [P03](phases/P03-workspace.md)                 | Dashboard project, cây thư mục, xem theo loại, CRUD sơ đồ, JSON | P02       | 2                           |
| [P04](phases/P04-engine.md)                    | Diagram engine dùng chung                                       | P03       | 3–4                         |
| [P05](phases/P05-common-architecture-gantt.md) | Nhóm hình chung + port Kiến trúc & Gantt                        | P04       | 2–3                         |
| [P06](phases/P06-usecase.md)                   | Use Case Diagram                                                | P05       | 2                           |
| [P07](phases/P07-usecase-spec.md)              | Đặc tả Use Case + xuất DOCX                                     | P06       | 2                           |
| [P08](phases/P08-class.md)                     | Class Diagram                                                   | P05       | 2–3                         |
| [P09](phases/P09-erd.md)                       | ERD + parse ORM từ Class + DDL                                  | P08       | 2–3                         |
| [P10](phases/P10-activity.md)                  | Activity Diagram + sinh từ đặc tả                               | P07       | 2–3                         |
| [P11](phases/P11-sequence.md)                  | Sequence Diagram + sinh từ đặc tả                               | P07       | 2–3                         |
| [P12](phases/P12-model-explorer.md)            | Model Explorer, traceability, tìm kiếm toàn project             | P06–P11   | 1–2                         |
| [P13](phases/P13-polish-deploy.md)             | Hoàn thiện, kiểm thử E2E, triển khai                            | tất cả    | 1–2                         |

P08–P09 có thể làm song song với P06–P07 vì chỉ cần engine (P04–P05).

## 8. Cách dùng với Claude Code

1. Tạo repo trống, chép thư mục này vào `docs/`, chép `CLAUDE.md` ra thư mục gốc.
2. Thư mục `reference/` đã có sẵn tool hiện tại (`unipark-diagram-studio.html`) và dữ liệu mẫu (`unipark-plus.json`) để Claude Code tham khảo style và code engine.
3. Mỗi phiên làm **đúng một phase**: mở file phase, dán phần **Prompt cho Claude Code** vào.
4. Sau mỗi phase, tự kiểm theo **Tiêu chí nghiệm thu**, rồi commit (`feat(P06): use case diagram`).
5. Nếu phase dài, bảo Claude Code làm theo từng mục con (ví dụ "P04 mục 4.1–4.4") và dừng để bạn kiểm.

## 9. Tài liệu đặc tả

| File                                                           | Nội dung                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| [spec/json-format.md](spec/json-format.md)                     | Định dạng JSON `umlab` (sơ đồ, project, legacy)                   |
| [spec/engine.md](spec/engine.md)                               | API shape/connector registry, marker, container, resource catalog |
| [spec/notation-common.md](spec/notation-common.md)             | Nhóm công cụ dùng chung mọi sơ đồ                                 |
| [spec/notation-usecase.md](spec/notation-usecase.md)           | Palette Use Case                                                  |
| [spec/notation-class.md](spec/notation-class.md)               | Palette Class                                                     |
| [spec/notation-erd.md](spec/notation-erd.md)                   | Palette ERD                                                       |
| [spec/notation-activity.md](spec/notation-activity.md)         | Palette Activity                                                  |
| [spec/notation-sequence.md](spec/notation-sequence.md)         | Palette Sequence                                                  |
| [spec/usecase-spec-template.md](spec/usecase-spec-template.md) | Mẫu đặc tả use case                                               |
| [spec/generators.md](spec/generators.md)                       | Luật sinh Activity/Sequence từ đặc tả                             |
| [spec/orm-mapping.md](spec/orm-mapping.md)                     | Luật parse Class → ERD và sinh DDL                                |
