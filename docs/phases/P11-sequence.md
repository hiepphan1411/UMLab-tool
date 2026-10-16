# P11 — Sequence Diagram + sinh từ đặc tả

**Mục tiêu:** Sequence Diagram với đủ palette như hình 4, bố cục theo thời gian, và sinh tự động từ đặc tả. Đặc tả: [spec/notation-sequence.md](../spec/notation-sequence.md), [spec/generators.md](../spec/generators.md) mục 2.

## Việc cần làm

1. **Layout engine riêng** (plugin của engine): lifeline theo trục x, message theo y, kéo đổi thứ tự, Shift+kéo chèn khoảng; activation bar tự tính (chỉnh tay được); đánh số lồng `1.1.2` tự động.
2. Palette đúng thứ tự spec với flyout: Lifeline◢ (Lifeline, Boundary, Control, Entity), Message◢ (Sync, Async, Reply), Alt. Combined Fragment◢ (12 toán tử), Duration Constraint◢ (Duration/Time Constraint, Duration/Time Observation).
3. Message đủ loại: Duration (xiên), Create (trỏ vào hộp đầu, hạ lifeline đích), Self, Recursive (activation lồng), Found, Lost, Reentrant, Destroy (✕).
4. Combined Fragment: nhãn ngũ giác, nhiều operand + guard, loop(min,max), tự phủ lifeline theo x; Interaction Use `ref` mở sơ đồ khác; Frame `sd`; Concurrent (coregion); Continuation; Gate; State Invariant.
5. Liên kết lifeline với class (`baseClassifier`) và message với operation (gợi ý + tạo operation mới vào class).
6. Kiểm tra theo spec mục 4.
7. **Sinh từ đặc tả:** `specToSequence` (lifeline actor/boundary/control/entity, ánh xạ bước, alt/opt/break/loop/ref) + bật nút trên editor đặc tả + banner sinh lại như P10.
8. Icon palette theo danh sách spec.

## Tiêu chí nghiệm thu

- Vẽ tay chuỗi đăng nhập 5 lifeline, 12 message, 1 alt 2 operand: số thứ tự và activation đúng; kéo message thứ 3 xuống dưới thứ 5 → đánh số lại đúng.
- Create message hạ hộp đầu lifeline đích đúng độ cao; Destroy cắt lifeline.
- Sinh từ UC03 → có `alt [thẻ không hợp lệ]`, `alt [biển số không khớp]`, lifeline `CheckInXeController`, các entity đã khai báo.
- Unit test generator + test tính activation/numbering.

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/notation-sequence.md, docs/spec/generators.md, docs/phases/P11-sequence.md.
Phiên 1: mục 1 (layout engine, activation, numbering) có test thuần. Phiên 2: mục 2–6. Phiên 3: mục 7–8.
```
