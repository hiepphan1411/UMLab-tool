# Sinh Activity & Sequence từ đặc tả use case

Code: `packages/core/src/generators/`. Hàm thuần, input `UseCaseSpec` + danh sách actor, output `{ views, connectors, model }` chưa có toạ độ → chạy `layout()` (elkjs) → toạ độ cuối. Unit test dùng fixture UC03 trong [usecase-spec-template.md](usecase-spec-template.md) và so sánh snapshot cấu trúc (không so toạ độ).

## 0. Quy tắc chung

- Sơ đồ sinh ra lưu `generatedFrom = { sourceDiagramId, sourceVersion, generator: 'spec-activity@1' }`, đặt cùng thư mục với đặc tả, tên `Activity - UC03 Check-in xe vào bãi`.
- **Sinh lại** khi đặc tả đã đổi (`sourceVersion` < `spec.version`): banner trên sơ đồ báo "Đặc tả đã thay đổi". Bấm Sinh lại → hộp thoại 3 lựa chọn:
  1. **Ghi đè** (mất chỉnh sửa tay, có thể Undo),
  2. **Tạo phiên bản mới** (sơ đồ mới hậu tố `v2`),
  3. **Huỷ**.
- Mỗi view sinh ra giữ `props.sourceStepId` để bấm vào hình thấy dòng tương ứng trong đặc tả (và ngược lại: chọn dòng đặc tả → nút "Xem trên Activity/Sequence").

## 1. Đặc tả → Activity Diagram

**Bố cục:** Swimlane **dọc**, mỗi làn một performer theo thứ tự xuất hiện: actor chính, actor phụ (nếu có bước), rồi **Hệ thống**. Làn gắn `represents` = actor tương ứng.

| Đặc tả                                  | Activity                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bắt đầu                                 | Initial Node ở làn của performer bước 1                                                                                               |
| Bước `Step`                             | Action (tên = `text`) trong làn của performer; nối tuần tự bằng Control Flow                                                          |
| Bước có `includeUseCaseId`              | Call Behavior Action, `behavior` trỏ Activity của use case đó nếu đã có                                                               |
| Bước có `loop.until`                    | Sau bước đó: Decision `[chưa until]` quay lại đầu bước (qua Merge), `[until]` đi tiếp                                                 |
| Luồng thay thế/ngoại lệ rẽ tại bước _n_ | Ngay sau Action bước _n_: **Decision Node**; nhánh chính guard `[không phải điều kiện]` (hoặc `[else]`), nhánh rẽ guard `[condition]` |
| Nhiều luồng rẽ cùng bước _n_            | Một Decision với nhiều nhánh                                                                                                          |
| Bước trong luồng rẽ                     | Action trong làn của performer bước đó                                                                                                |
| `end: returnTo m`                       | Chèn **Merge Node** ngay trước Action bước _m_ (nếu chưa có), nối nhánh vào Merge                                                     |
| `end: endSuccess`                       | Nối tới **Activity Final** chung                                                                                                      |
| `end: endFailure`                       | Nối tới **Flow Final** riêng của nhánh (hoặc Activity Final nếu tuỳ chọn "Kết thúc thất bại = Activity Final")                        |
| Kết thúc luồng chính                    | Activity Final                                                                                                                        |
| `postconditions`                        | Note gắn Activity Final (tuỳ chọn)                                                                                                    |

**Ví dụ UC03:** làn _Sinh viên_ | _Bảo vệ_ | _Hệ thống_ (_Thiết bị cổng_ không có bước nào nên không sinh làn). Initial → [SV] Quét thẻ → [HT] Kiểm tra thẻ → Decision{[thẻ hợp lệ] → [HT] Chụp & nhận dạng biển số ; [thẻ không hợp lệ] → [HT] Hiển thị "Thẻ không hợp lệ" → Flow Final} → [HT] Đối chiếu biển số → Decision{[khớp] → Merge ; [không khớp] → [HT] Thông báo bảo vệ → [BV] Xác nhận thủ công → Merge} → Merge → [HT] Kiểm tra gói/ví → Decision{[đủ] … ; [không đủ] → [HT] Thông báo nạp tiền → Flow Final} → [HT] Tạo phiên & mở barrier → [SV] Đưa xe vào → Activity Final.

**Layout:** elkjs `layered`, hướng `DOWN`, ràng buộc partition theo làn (`elk.partitioning.activate`), khoảng cách node 36, lớp 48; Decision/Merge căn giữa làn; nhánh lỗi lệch phải.

## 2. Đặc tả → Sequence Diagram

**Lifeline sinh ra (trái → phải):**

1. `Actor` cho actor chính (và actor phụ nếu có bước).
2. `Boundary` cho mỗi `screens[]` (mặc định 1 boundary `Giao diện <tên UC>` nếu trống).
3. `Control`: `<TenUC>Controller` (PascalCase không dấu, ví dụ `CheckInXeController`).
4. `Entity` cho mỗi `entities[]` (gắn `baseClassifier = classId` nếu có).
5. Lifeline thường cho `interaction.target = 'external'` (hệ thống ngoài, thiết bị).

**Ánh xạ bước:**

| Bước                                 | Message sinh ra                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor làm (mặc định)                 | Actor → Boundary: sync `text` (hoặc `interaction.message`)                                                                                                                                                                                       |
| Hệ thống làm, không có `interaction` | Boundary → Control: sync; Control self message `text`                                                                                                                                                                                            |
| Hệ thống, `target: 'entity'`         | Control → Entity `targetName`: sync `message`; Entity → Control: reply `returns` (nếu có)                                                                                                                                                        |
| Hệ thống, `target: 'external'`       | Control → lifeline ngoài: sync/async theo `kind`                                                                                                                                                                                                 |
| Hệ thống, `target: 'ui'` (hiển thị)  | Control → Boundary: reply/`hienThi(...)`; Boundary → Actor: reply (thông báo)                                                                                                                                                                    |
| `kind: 'create'`                     | Create Message, hộp đầu lifeline đích hạ xuống                                                                                                                                                                                                   |
| Bước có `includeUseCaseId`           | Interaction Use `ref <tên UC>` phủ các lifeline liên quan                                                                                                                                                                                        |
| Bước có `loop.until`                 | Fragment `loop [until …]` bao các message của bước                                                                                                                                                                                               |
| Luồng rẽ tại bước _n_                | Fragment **`alt`** quanh phần từ bước _n+1_: operand 1 `[không phải điều kiện]` = luồng chính đến điểm hội tụ; operand 2 `[condition]` = các bước của luồng rẽ. Ngoại lệ kết thúc thất bại có thể dùng **`break`** (tuỳ chọn "Ngoại lệ → break") |
| Một luồng rẽ, không có nhánh else rõ | Fragment **`opt`**                                                                                                                                                                                                                               |

- Activation bar và đánh số tự tính như editor.
- Sau cùng: reply từ Control → Boundary → Actor với hậu điều kiện thành công (tuỳ chọn).

**Ví dụ UC03 (rút gọn):**

```
SinhVien → GiaoDienCong : quetThe(maThe)            1
GiaoDienCong → CheckInXeController : xuLyQuetThe()   1.1
CheckInXeController → TheRFID : kiemTra(maThe)       1.1.1
TheRFID --> CheckInXeController : hopLe
alt [thẻ không hợp lệ]
   CheckInXeController --> GiaoDienCong : hienThiLoi("Thẻ không hợp lệ")
else [thẻ hợp lệ]
   CheckInXeController → CameraCong : chupBienSo()  …
end
```

**Layout:** cố định, không cần elkjs: lifeline cách nhau `max(160, độ rộng tên + 40)`; message cách nhau 36px; fragment thêm 28px đầu, 12px cuối.

## 3. Đồng bộ ngược (tuỳ chọn, P12)

Sửa tên Action/Message trên sơ đồ sinh ra → hỏi "Cập nhật lại bước tương ứng trong đặc tả?".
