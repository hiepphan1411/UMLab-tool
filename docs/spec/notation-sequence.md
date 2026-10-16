# Sequence Diagram — palette & ký hiệu

Thứ tự palette (theo hình 4):

```
Cursor◢
Lifeline◢ · Message◢ · Duration Message · Create Message · Self Message · Recursive Message
Found Message · Lost Message · Reentrant Message
Alt. Combined Fragment◢ · Interaction Use · Frame · Actor · Concurrent · Continuation · Gate · Duration Constraint◢
Element Group · Note · Anchor · Constraint
| Allocate · Rationale · Problem
| Package◢ · Diagram Overview · Generic Connector · User Story · Image · Screen Capture · Callout
  Rectangle · Oval · Polygon · Line · Text Box · Diagram Info
| Pencil · Pen · Calligraphy Tool · Connector
```

## 1. Mô hình bố cục riêng

Sequence diagram **không** dùng toạ độ tự do như các sơ đồ khác:

- Lifeline xếp theo trục ngang (`x`), kéo để đổi thứ tự; khoảng cách tối thiểu 40px.
- Message có toạ độ `y` (thời gian). Kéo message lên/xuống đổi thứ tự; **Shift + kéo** chèn khoảng trống đẩy các message bên dưới.
- **Activation bar** (hình chữ nhật hẹp trên lifeline) **tự tính** từ các message: message sync tới lifeline mở activation, reply đóng activation; có thể chỉnh tay (kéo đầu/cuối).
- **Đánh số tự động** kiểu lồng nhau `1`, `1.1`, `1.2`, `2` (bật/tắt trong Inspector sơ đồ).
- Fragment tự bao các lifeline nó phủ theo `x`; chỉnh bằng kéo cạnh trái/phải.

## 2. Node

| Công cụ / biến thể                              | Shape                    | Ký hiệu                                                                                                                                           | Thuộc tính                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lifeline ◢** → Lifeline                       | `seq.lifeline`           | Hộp đầu chữ nhật ghi `name : Type` (gạch chân tuỳ chọn), **đường nét đứt dọc** xuống dưới                                                         | name, baseClassifier (chọn class trong project), stereotype, isDestroyed (vẽ **✕** cuối đường), stateInvariants[]                                                                                         |
| → Boundary Lifeline                             | `seq.boundary`           | Đầu là **vòng tròn có vạch chữ T nằm ngang bên trái** (ký hiệu boundary), tên dưới                                                                | như trên                                                                                                                                                                                                  |
| → Control Lifeline                              | `seq.control`            | Đầu là **vòng tròn có mũi tên cong** phía trên                                                                                                    | như trên                                                                                                                                                                                                  |
| → Entity Lifeline                               | `seq.entity`             | Đầu là **vòng tròn có vạch ngang bên dưới**                                                                                                       | như trên                                                                                                                                                                                                  |
| Actor                                           | `seq.actor`              | Đầu là **hình người que**, tên dưới, đường nét đứt dọc                                                                                            | actor (liên kết Actor trong use case)                                                                                                                                                                     |
| Frame                                           | `seq.frame`              | Khung bao toàn sơ đồ, nhãn **ngũ giác** góc trên trái `sd Tên`                                                                                    | name, parameters                                                                                                                                                                                          |
| **Alt. Combined Fragment ◢**                    | `seq.fragment`           | Khung chữ nhật, nhãn ngũ giác góc trên trái chứa toán tử; các **operand** ngăn bởi **đường nét đứt ngang**; guard `[điều kiện]` ở đầu mỗi operand | operator: `alt` (mặc định) · `opt` · `loop` · `par` · `break` · `critical` · `neg` · `assert` · `strict` · `seq` · `ignore` · `consider`; operands[] {guard}; loop: min, max; ignore/consider: messages[] |
| Interaction Use                                 | `seq.ref`                | Khung có nhãn ngũ giác `ref`, tên tương tác ở giữa, phủ các lifeline                                                                              | refDiagramId (double-click mở), arguments, returnValue                                                                                                                                                    |
| Concurrent                                      | `seq.coregion`           | **Ngoặc vuông dọc** hai đầu (dạng ⌐ ⌙) đặt trên lifeline, đánh dấu vùng các sự kiện không xét thứ tự                                              | lifelineId, yStart, yEnd                                                                                                                                                                                  |
| Continuation                                    | `seq.continuation`       | **Hình viên thuốc** (chữ nhật bo tròn hai đầu) ghi tên, nằm ngang qua lifeline                                                                    | name                                                                                                                                                                                                      |
| Gate                                            | `seq.gate`               | Điểm nhỏ trên viền Frame/Interaction Use/Fragment, nơi message đi vào/ra                                                                          | name                                                                                                                                                                                                      |
| **Duration Constraint ◢** → Duration Constraint | `seq.durationConstraint` | **Ngoặc dọc có mũi tên 2 đầu** giữa hai message, nhãn `{d..3*d}`                                                                                  | expr, fromMessageId, toMessageId                                                                                                                                                                          |
| → Time Constraint                               | `seq.timeConstraint`     | Nhãn `{t..t+3}` gắn với một thời điểm (đầu message) bằng đường mảnh                                                                               | expr, messageId, end                                                                                                                                                                                      |
| → Duration Observation                          | `seq.durationObs`        | Ngoặc có nhãn `d = duration`                                                                                                                      | name                                                                                                                                                                                                      |
| → Time Observation                              | `seq.timeObs`            | Nhãn `t = now` gắn thời điểm                                                                                                                      | name                                                                                                                                                                                                      |
| State Invariant (thêm)                          | `seq.stateInvariant`     | Nhãn `{trạng thái}` hoặc hình bo tròn đặt lên lifeline                                                                                            | expr                                                                                                                                                                                                      |

## 3. Message

| Công cụ / biến thể                 | kind            | Ký hiệu                                                                                         | Hành vi                                             |
| ---------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Message ◢** → Synchronous (Call) | `seq.sync`      | Đường **liền**, **mũi tên đặc**                                                                 | Mở activation trên đích; tuỳ chọn tự tạo reply      |
| → Asynchronous (Signal)            | `seq.async`     | Đường liền, **mũi tên mở**                                                                      | Không chờ                                           |
| → Reply (Return)                   | `seq.reply`     | Đường **nét đứt**, mũi tên mở                                                                   | Đóng activation; nhãn là giá trị trả về             |
| Duration Message                   | `seq.duration`  | Message **xiên xuống** (đầu đích thấp hơn đầu nguồn)                                            | Có độ trễ; props duration                           |
| Create Message                     | `seq.create`    | Nét đứt + mũi tên mở, nhãn `«create»`, **trỏ vào hộp đầu** của lifeline đích                    | Hộp đầu lifeline đích dời xuống đúng độ cao message |
| Self Message                       | `seq.self`      | Mũi tên **vòng** từ lifeline quay lại chính nó                                                  |                                                     |
| Recursive Message                  | `seq.recursive` | Vòng tự gọi + **activation lồng** (lệch phải)                                                   |                                                     |
| Found Message                      | `seq.found`     | Bắt đầu bằng **chấm tròn đặc** (nguồn không xác định) → lifeline                                |                                                     |
| Lost Message                       | `seq.lost`      | Lifeline → kết thúc bằng **chấm tròn đặc**                                                      |                                                     |
| Reentrant Message                  | `seq.reentrant` | Message gọi ngược lại lifeline đang có activation mở → tạo **activation lồng** trên lifeline đó |                                                     |
| (Destroy)                          | `seq.destroy`   | Message `«destroy»` tới lifeline → đặt ✕ và cắt đường lifeline                                  | Có trong menu chuột phải lifeline                   |

**Thuộc tính message:**

```ts
{ name; arguments: string[]; returnValue?; guard?; operationRef?: { classId; operationId };
  number?: string /* tính tự động, có thể ghi đè */; kind; isAsync;
  sourceY; targetY; sourceLifelineId?; targetLifelineId?;   // null cho found/lost
  replyOf?: messageId }
```

- Khi lifeline có `baseClassifier`, ô nhập tên message gợi ý các operation của class đó; chọn xong gắn `operationRef`; chưa có thì hỏi "Thêm operation `xxx()` vào class `Yyy`?".

## 4. Kiểm tra

- Reply không khớp message sync nào.
- Message tới lifeline đã bị destroy (y lớn hơn điểm ✕).
- Fragment `alt` chỉ có 1 operand (gợi ý dùng `opt`).
- Operand thiếu guard (trừ operand cuối có thể là `[else]`).
- Lifeline không có message nào.

## 5. Sinh từ đặc tả use case

Xem [generators.md](generators.md) mục 2.

## 6. Icon cần vẽ

`lifeline, boundary, control, entity, message-sync, message-async, message-reply, duration-message, create-message, self-message, recursive-message, found-message, lost-message, reentrant-message, combined-fragment, interaction-use, frame, actor, concurrent, continuation, gate, duration-constraint, time-constraint, duration-observation, time-observation, state-invariant`
