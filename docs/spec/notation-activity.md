# Activity Diagram — palette & ký hiệu

Thứ tự palette (theo hình 3):

```
Cursor◢
Activity · Activity Parameter Node · Action◢ · Decision Node◢ · Initial Node · Activity Final Node◢
Input Pin◢ · Object Node◢ · Interruptible Activity Region · Expansion Region · Expansion Node
Horizontal Swimlane◢ · Control Flow · Object Flow · Exception Handler · Structured Activity Node◢
Element Group · Note · Anchor · Constraint · Containment
| Control Operator Activity · Control Operator Action · Value Specification Action
| Allocate · Rationale · Problem
| Package◢ · Diagram Overview · Generic Connector · User Story · Image · Screen Capture · Callout
  Rectangle · Oval · Polygon · Line · Text Box · Diagram Info
| Pencil · Pen · Calligraphy Tool · Connector
```

## 1. Node

| Công cụ / biến thể                          | Shape                 | Ký hiệu                                                                                                                       | Thuộc tính                                                                                      |
| ------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Activity                                    | `act.activity`        | Khung **chữ nhật bo góc lớn**, tên góc trên trái; có thể chứa toàn bộ sơ đồ; dòng `«precondition»`/`«postcondition»` dưới tên | name, parameters[], preconditions, postconditions, isReadOnly, isSingleExecution; container `*` |
| Activity Parameter Node                     | `act.paramNode`       | Hình chữ nhật nhỏ **nằm đè lên viền** Activity (tự bám viền)                                                                  | name, type, direction in/out/inout/return, isStream, isException                                |
| **Action ◢** → Action                       | `act.action`          | Chữ nhật **bo góc tròn**, tên giữa                                                                                            | name, body (opaque), localPre/Post                                                              |
| → Call Behavior Action                      | `act.callBehavior`    | Như Action + **icon cào ⋔** góc dưới phải                                                                                     | behavior (chọn activity khác trong project; double-click mở)                                    |
| → Call Operation Action                     | `act.callOperation`   | Như Action, dòng phụ `(Class::operation)`                                                                                     | operation (chọn từ class diagram)                                                               |
| → Send Signal Action                        | `act.sendSignal`      | **Ngũ giác lồi** (mũi nhọn bên phải)                                                                                          | signal                                                                                          |
| → Accept Event Action                       | `act.acceptEvent`     | **Ngũ giác lõm** (khuyết hình chữ V bên trái)                                                                                 | event                                                                                           |
| → Accept Time Event Action                  | `act.acceptTime`      | **Đồng hồ cát** (2 tam giác đối đỉnh), nhãn bên dưới                                                                          | when (ví dụ `sau 30 giây`)                                                                      |
| **Decision Node ◢** → Decision Node         | `act.decision`        | **Hình thoi** rỗng nhỏ; nhãn câu hỏi tuỳ chọn cạnh thoi                                                                       | decisionInput (note `«decisionInput»`)                                                          |
| → Merge Node                                | `act.merge`           | Hình thoi (giống decision, khác ngữ nghĩa: nhiều vào 1 ra)                                                                    | —                                                                                               |
| → Fork Node                                 | `act.fork`            | **Thanh đen dày** (ngang hoặc dọc)                                                                                            | orientation                                                                                     |
| → Join Node                                 | `act.join`            | Thanh đen dày                                                                                                                 | orientation, joinSpec `{joinSpec = …}`                                                          |
| Initial Node                                | `act.initial`         | **Chấm tròn đặc**                                                                                                             | —                                                                                               |
| **Activity Final Node ◢** → Activity Final  | `act.final`           | **Mắt bò** (tròn đặc trong vòng tròn)                                                                                         | —                                                                                               |
| → Flow Final                                | `act.flowFinal`       | Vòng tròn có **dấu ✕** bên trong                                                                                              | —                                                                                               |
| **Input Pin ◢** → Input Pin                 | `act.inputPin`        | Ô vuông nhỏ **bám viền Action**, tên cạnh ô; mũi tên nhỏ trỏ vào (khi hiện pin dạng mũi tên)                                  | name, type, multiplicity, isControl                                                             |
| → Output Pin                                | `act.outputPin`       | Ô vuông nhỏ bám viền, mũi tên trỏ ra                                                                                          | như trên                                                                                        |
| → Value Pin                                 | `act.valuePin`        | Ô vuông bám viền, nhãn giá trị                                                                                                | value                                                                                           |
| → Action Input Pin                          | `act.actionInputPin`  | Ô vuông bám viền, nối tới action con                                                                                          | fromAction                                                                                      |
| **Object Node ◢** → Object Node             | `act.object`          | **Chữ nhật** (không bo), `ten : Kieu`, trạng thái `[state]` dưới tên                                                          | name, type, inState, upperBound, ordering FIFO/LIFO                                             |
| → Central Buffer Node                       | `act.centralBuffer`   | Chữ nhật + `«centralBuffer»`                                                                                                  | như object                                                                                      |
| → Data Store Node                           | `act.dataStore`       | Chữ nhật + `«datastore»`                                                                                                      | như object                                                                                      |
| Interruptible Activity Region               | `act.interruptRegion` | **Chữ nhật bo góc nét đứt**, không tên                                                                                        | container                                                                                       |
| Expansion Region                            | `act.expansionRegion` | **Chữ nhật bo góc nét đứt**, từ khoá góc trên trái `«iterative»`/`«parallel»`/`«stream»`                                      | mode; container                                                                                 |
| Expansion Node                              | `act.expansionNode`   | **Ô dài chia 3–4 ngăn** bám viền Expansion Region                                                                             | —                                                                                               |
| **Horizontal Swimlane ◢** → Horizontal      | `act.swimlaneH`       | Bảng làn **ngang**: cột tiêu đề bên trái ghi tên làn                                                                          | lanes[] {id, name, represents (actor/class)}, nested                                            |
| → Vertical                                  | `act.swimlaneV`       | Bảng làn **dọc**: hàng tiêu đề trên cùng                                                                                      | như trên                                                                                        |
| **Structured Activity Node ◢** → Structured | `act.structured`      | Chữ nhật bo góc nét đứt, `«structured»`                                                                                       | container                                                                                       |
| → Loop Node                                 | `act.loop`            | Như trên, `«loop»`, 3 ngăn **setup / test / body**                                                                            | testedFirst                                                                                     |
| → Conditional Node                          | `act.conditional`     | `«conditional»`, các mệnh đề **test / body** xếp dọc                                                                          | clauses[], isAssured, isDeterminate                                                             |
| → Sequence Node                             | `act.sequenceNode`    | `«sequence»`, con thực hiện tuần tự                                                                                           | container                                                                                       |
| Control Operator Activity                   | `act.ctrlOpActivity`  | Activity với `«controlOperator»`                                                                                              | như Activity                                                                                    |
| Control Operator Action                     | `act.ctrlOpAction`    | Action với `«controlOperator»`                                                                                                | như Action                                                                                      |
| Value Specification Action                  | `act.valueSpec`       | Action hiển thị biểu thức giá trị                                                                                             | value                                                                                           |

### Swimlane (chi tiết)

- Thêm/xoá/đổi tên/kéo đổi thứ tự làn từ thanh tiêu đề; kéo vạch ngăn để đổi bề rộng.
- Thả node vào làn → node thuộc làn (lưu `laneId`); kéo làn → node đi theo.
- Làn lồng (sub-partition) tối đa 2 cấp. Swimlane ngang và dọc có thể giao nhau thành lưới (2 chiều).
- Làn có thể gắn `represents` = Actor (từ use case) hoặc Class → dùng cho sinh tự động.

## 2. Đường nối

| Công cụ           | kind                   | Ký hiệu                                 | Luật                                                                             | Thuộc tính                                                                                                    |
| ----------------- | ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Control Flow      | `act.controlFlow`      | Liền + mũi tên mở                       | Không vào Initial; không ra khỏi Final; Fork 1 vào nhiều ra; Join nhiều vào 1 ra | name, guard `[…]`, weight; `interrupts` (khi đi từ trong Interruptible Region ra ngoài → vẽ dạng **tia sét**) |
| Object Flow       | `act.objectFlow`       | Liền + mũi tên mở (nối pin/object node) | Ít nhất một đầu là Object Node/Pin/Parameter Node                                | name, guard, weight, `«transformation»`, `«selection»`, isMulticast, isMultireceive                           |
| Exception Handler | `act.exceptionHandler` | Đường **tia sét** + mũi tên mở          | Từ node được bảo vệ → input pin của handler                                      | exceptionTypes[]                                                                                              |

## 3. Kiểm tra

- Không có Initial Node; nhiều Initial Node trong cùng activity (thông tin).
- Không có Activity Final/Flow Final.
- Decision: nhánh ra thiếu guard; không có nhánh `[else]` (thông tin); guard trùng nhau.
- Fork/Join không cân (số nhánh khác nhau) — thông tin.
- Node không thể tới từ Initial (unreachable).
- Pin không nằm trên viền Action.

## 4. Sinh từ đặc tả use case

Xem [generators.md](generators.md) mục 1. Sơ đồ sinh ra có `generatedFrom`, banner trên canvas: "Sinh từ đặc tả UC03 · phiên bản 4 · [Sinh lại] [Bỏ liên kết]".

## 5. Icon cần vẽ

`activity, param-node, action, call-behavior, call-operation, send-signal, accept-event, accept-time, decision, merge, fork, join, initial, final, flow-final, input-pin, output-pin, value-pin, action-input-pin, object-node, central-buffer, data-store, interruptible-region, expansion-region, expansion-node, swimlane-h, swimlane-v, control-flow, object-flow, exception-handler, structured-node, loop-node, conditional-node, sequence-node, control-operator-activity, control-operator-action, value-spec-action`
