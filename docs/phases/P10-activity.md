# P10 — Activity Diagram + sinh từ đặc tả

**Mục tiêu:** Activity Diagram với đủ palette như hình 3, và sinh tự động từ đặc tả use case. Đặc tả: [spec/notation-activity.md](../spec/notation-activity.md), [spec/generators.md](../spec/generators.md) mục 1.

## Việc cần làm

1. Palette đúng thứ tự spec với các flyout: Action◢ (6 biến thể), Decision Node◢ (Decision, Merge, Fork, Join), Activity Final Node◢ (Activity Final, Flow Final), Input Pin◢ (Input, Output, Value, Action Input), Object Node◢ (Object, Central Buffer, Data Store), Horizontal Swimlane◢ (Ngang, Dọc), Structured Activity Node◢ (Structured, Loop, Conditional, Sequence).
2. Shape đúng ký hiệu: ngũ giác lồi/lõm cho Send Signal/Accept Event, đồng hồ cát Accept Time, icon cào ⋔ cho Call Behavior, thanh Fork/Join (xoay ngang/dọc), mắt bò, ⊗ Flow Final.
3. **Pin & Parameter Node bám viền:** kéo trượt dọc viền Action/Activity, không rời được viền; xoay mũi tên pin theo cạnh.
4. **Swimlane:** thêm/xoá/đổi tên/đổi thứ tự/đổi rộng làn, làn lồng 2 cấp, lưới 2 chiều, node thuộc làn, `represents`.
5. Interruptible Region + Control Flow ngắt (vẽ tia sét); Expansion Region + Expansion Node bám viền; Loop/Conditional Node có các ngăn.
6. Control Flow (guard, weight), Object Flow (transformation, selection), Exception Handler (tia sét) với luật nối trong spec.
7. Kiểm tra theo spec mục 3.
8. **Sinh từ đặc tả:** `specToActivity` trong `packages/core/src/generators` + layout elkjs có partition; bật nút trên editor đặc tả; banner "Sinh từ đặc tả… [Sinh lại] [Bỏ liên kết]"; dialog Ghi đè / Phiên bản mới; liên kết 2 chiều bước ↔ hình.
9. Icon palette theo danh sách spec.

## Tiêu chí nghiệm thu

- Sinh từ UC03 → đúng 3 làn, 3 Decision, 1 Merge, 2 Flow Final, 1 Activity Final như ví dụ trong generators.md; không hình nào đè nhau.
- Sửa đặc tả (thêm bước) → banner báo thay đổi; Sinh lại (Ghi đè) → sơ đồ cập nhật, Undo quay lại được.
- Kéo Output Pin quanh Action luôn dính viền.
- Control Flow từ Final ra ngoài bị chặn.
- Unit test generator: snapshot cấu trúc cho UC03 và 2 fixture nhỏ (chỉ luồng chính; có loop).

## Prompt cho Claude Code

```
Đọc CLAUDE.md, docs/spec/notation-activity.md, docs/spec/generators.md, docs/phases/P10-activity.md.
Phiên 1: mục 1–7 (editor). Phiên 2: mục 8 (generator + layout + liên kết với đặc tả) và 9.
```
