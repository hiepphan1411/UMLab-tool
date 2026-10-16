# Đặc tả Use Case — mẫu & dữ liệu

Loại sơ đồ `usecase-spec` không có canvas: `diagram.data` chứa đặc tả. Mỗi đặc tả gắn với **một** use case (`useCaseId` → ModelElement `uml.usecase`).

## 1. Dữ liệu

```ts
interface UseCaseSpec {
  useCaseId: string; // liên kết model; mã + tên lấy từ use case
  version: number; // tăng mỗi lần lưu có thay đổi nội dung
  primaryActors: string[]; // id actor; tự điền từ association trên use case diagram
  secondaryActors: string[];
  description: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  trigger: string; // Sự kiện kích hoạt
  preconditions: string[];
  postconditions: { success: string[]; failure: string[] };
  mainFlow: Step[];
  alternativeFlows: Flow[]; // A1, A2…
  exceptionFlows: Flow[]; // E1, E2…
  businessRules: { code: string; text: string }[]; // BR01…
  nonFunctional: { code: string; text: string }[]; // NFR01…
  includes: string[];
  extends: string[]; // tự điền từ diagram (chỉ đọc)
  frequency?: string;
  notes?: string;
  screens: { id: string; name: string }[]; // màn hình/UI liên quan (dùng cho boundary)
  entities: { id: string; name: string; classId?: string }[]; // dữ liệu liên quan (dùng cho entity)
}

interface Step {
  id: string;
  no: number; // tự đánh số 1..n
  performer: { kind: 'actor'; actorId: string } | { kind: 'system' };
  text: string; // "Sinh viên quét thẻ RFID tại cổng"
  // gợi ý cho bộ sinh sequence (tuỳ chọn, mở bằng nút "Chi tiết tương tác")
  interaction?: {
    target: 'ui' | 'controller' | 'entity' | 'external';
    targetName?: string; // tên màn hình / entity / hệ thống ngoài
    message?: string; // "quetThe(maThe)"
    kind?: 'sync' | 'async' | 'create' | 'destroy';
    returns?: string; // "thongTinXe"
  };
  loop?: { until: string }; // bước lặp → loop fragment / vòng lặp activity
  includeUseCaseId?: string; // bước "Thực hiện UC xx" → Call Behavior / ref
}

interface Flow {
  id: string;
  code: string; // A1 / E1
  name: string; // "Thẻ không hợp lệ"
  branchAt: number; // rẽ nhánh tại bước số mấy của luồng chính
  condition: string; // "Thẻ không tồn tại trong hệ thống"
  steps: Step[]; // đánh số A1.1, A1.2…
  end: { kind: 'returnTo'; stepNo: number } | { kind: 'endSuccess' } | { kind: 'endFailure' };
}
```

## 2. Giao diện soạn thảo

- Bên trái: mục lục các phần (Thông tin chung, Tác nhân, Điều kiện, Luồng chính, Luồng thay thế, Luồng ngoại lệ, Quy tắc nghiệp vụ, Phi chức năng). Bên phải: Inspector use case gốc (mã, tên, trạng thái).
- **Luồng sự kiện là bảng 3 cột** `STT | Thực hiện bởi | Hành động`:
  - Cột "Thực hiện bởi" là dropdown: các actor của use case + "Hệ thống".
  - Enter cuối dòng tạo bước mới; tự đổi performer xen kẽ (actor → hệ thống) theo dòng trên.
  - Kéo thả đổi thứ tự, số bước tự đánh lại và **các luồng thay thế tham chiếu tự cập nhật** `branchAt`/`returnTo`.
  - Nút "⋯" mỗi dòng: Chi tiết tương tác, Đánh dấu lặp, Gọi use case khác, Tạo luồng thay thế từ bước này.
- Luồng thay thế/ngoại lệ: thẻ có mã, tên, "Rẽ từ bước [n]", điều kiện, bảng bước, "Kết thúc: Quay lại bước [m] / Kết thúc thành công / Kết thúc thất bại".
- Thanh trên: **Sinh Activity Diagram**, **Sinh Sequence Diagram**, **Xuất DOCX**, **Xuất Markdown**, Xuất/Nhập JSON.
- Cảnh báo: luồng thay thế rẽ từ bước không tồn tại; quay lại bước không tồn tại; bước rỗng; use case chưa có actor chính.

## 3. Xuất DOCX (mẫu báo cáo khóa luận)

Bảng 2 cột viền đen, cột trái tô xám nhạt, font Times New Roman 13:

| Mục                   | Nội dung                                   |
| --------------------- | ------------------------------------------ |
| Mã use case           | UC03                                       |
| Tên use case          | Check-in xe vào bãi                        |
| Tác nhân chính        | Sinh viên                                  |
| Tác nhân phụ          | Thiết bị RFID, Camera                      |
| Mô tả                 | …                                          |
| Mức độ ưu tiên        | Cao                                        |
| Sự kiện kích hoạt     | …                                          |
| Tiền điều kiện        | 1. …                                       |
| Hậu điều kiện         | Thành công: … · Thất bại: …                |
| Luồng sự kiện chính   | bảng con `STT · Thực hiện bởi · Hành động` |
| Luồng thay thế        | A1 – Tên (tại bước n): bảng con…           |
| Luồng ngoại lệ        | E1 – …                                     |
| Quy tắc nghiệp vụ     | BR01: …                                    |
| Yêu cầu phi chức năng | NFR01: …                                   |

Dùng thư viện `docx`. Có thể xuất **nhiều đặc tả vào một file** từ dashboard project (chọn nhiều → Xuất DOCX), mỗi đặc tả một tiêu đề `Bảng x: Đặc tả use case UCxx`.

## 4. Ví dụ dữ liệu mẫu (UniPark+ — dùng làm fixture test)

UC03 **Check-in xe vào bãi** — actor chính _Sinh viên_, phụ _Bảo vệ_, _Thiết bị cổng_. Màn hình: _Màn hình cổng vào_. Dữ liệu: _TheRFID_, _Xe_, _GoiThang_, _ViDienTu_, _PhienGuiXe_.
Luồng chính:

1. Sinh viên — Quét thẻ RFID tại cổng vào.
2. Hệ thống — Đọc mã thẻ và kiểm tra thẻ hợp lệ.
3. Hệ thống — Chụp ảnh biển số và nhận dạng (ALPR).
4. Hệ thống — Đối chiếu biển số với xe đã đăng ký của sinh viên.
5. Hệ thống — Kiểm tra gói tháng hoặc số dư ví.
6. Hệ thống — Tạo phiên gửi xe và mở barrier.
7. Sinh viên — Đưa xe vào bãi.

A1 _Biển số không khớp_ (tại bước 4, điều kiện: biển số khác xe đăng ký): A1.1 Hệ thống — Thông báo bảo vệ kiểm tra; A1.2 Bảo vệ — Xác nhận thủ công → quay lại bước 5.
E1 _Thẻ không hợp lệ_ (tại bước 2): E1.1 Hệ thống — Hiển thị "Thẻ không hợp lệ" → kết thúc thất bại.
E2 _Không đủ số dư_ (tại bước 5): E2.1 Hệ thống — Thông báo nạp tiền → kết thúc thất bại.
