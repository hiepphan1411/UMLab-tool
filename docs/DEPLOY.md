# Triển khai UMLab (bản desktop)

UMLab không có máy chủ riêng: mỗi máy chạy app Electron và kết nối thẳng MongoDB Atlas; dữ liệu project nằm trong tệp
`.umlab` trên máy (local-first) và được đồng bộ qua MongoDB. “Triển khai” vì vậy gồm 3 việc: **chuẩn bị MongoDB
Atlas**, **đóng gói bộ cài `.exe`** có nhúng chuỗi kết nối, và **phát hành / hỗ trợ người dùng**.

## 1. Chuẩn bị MongoDB Atlas

1. Tạo cluster (M0 miễn phí dùng được cho nhóm nhỏ; nên M10+ khi nhiều người dùng đồng thời). Change stream cần
   replica set — mọi cluster Atlas đều là replica set.
2. **Database Access → Add New Database User**:
   - Authentication: Password, đặt mật khẩu dài ngẫu nhiên.
   - **Database User Privileges → Specific Privileges → `readWrite` @ `umlab`** (chỉ database `umlab`). Không dùng tài
     khoản admin / tài khoản chung với hệ thống khác cho bản phát hành — chuỗi kết nối nằm trong app nên coi như công
     khai với người có bộ cài.
3. **Network Access → IP Access List**:
   - Nhóm làm việc cố định: thêm IP công cộng của văn phòng / phòng lab.
   - Người dùng di động (sinh viên, làm ở nhà): buộc phải mở `0.0.0.0/0`; khi đó **user riêng chỉ quyền `umlab`** ở
     bước 2 là lớp bảo vệ chính, và nên đổi mật khẩu user Atlas (rồi phát hành bản cài mới) nếu bộ cài bị lộ ra ngoài.
4. **Connect → Drivers** → sao chép chuỗi `mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority`.
5. App tự tạo collection và index khi chạy lần đầu (`users`, `projects`, `project_updates`, `presence`, `diagram_versions`,
   `assets`, `login_attempts`); không cần migrate tay.

## 2. Đóng gói bộ cài Windows

Yêu cầu: Windows 10/11 x64, Node.js ≥ 20.19, Git.

```powershell
git clone <repo> UMLab-tool
cd UMLab-tool
copy .env.example .env      # điền UMLAB_MONGO_URI (bước 1.4) và UMLAB_DB=umlab
npm ci
npm run check               # lint + typecheck + unit test
npm run dist                # → apps/desktop/release/<version>/UMLab-Setup-<version>.exe (+ UMLab-Portable-<version>.exe)
```

- Chuỗi kết nối trong `.env` được **nhúng vào bản build** (`electron.vite.config.ts` → `__UMLAB_MONGO_URI__`); người
  dùng **không đổi được** trong app (Cài đặt → Kết nối chỉ hiển thị trạng thái). Đổi cluster = phát hành bản mới.
- Có thể ghi đè khi chạy bằng biến môi trường `UMLAB_MONGO_URI` / `UMLAB_DB` (dùng cho thử nghiệm, CI).
- Đổi phiên bản: sửa `version` trong `apps/desktop/package.json` trước khi `npm run dist`.
- CI (`.github/workflows/ci.yml`): job `check` chạy lint/typecheck/test trên Ubuntu; job `e2e-and-package` trên
  `windows-latest` chạy Playwright (Electron + mongodb-memory-server) rồi đóng gói `.exe` — cần secret
  `UMLAB_MONGO_URI` trong GitHub → Settings → Secrets.
- Chữ ký số (khuyến nghị khi phát hành rộng để tránh cảnh báo SmartScreen): đặt `CSC_LINK` / `CSC_KEY_PASSWORD` trước
  `npm run dist` (electron-builder tự ký).

## 3. Phát hành & vận hành

- Gửi `UMLab-Setup-<version>.exe` (cài cho người dùng hiện tại, chọn được thư mục cài, tạo shortcut) hoặc bản
  **Portable** (chạy không cần cài).
- Dữ liệu cục bộ: thư mục người dùng chọn khi tạo project (mặc định `Documents/UMLab`, mỗi project một tệp
  `<tên>.umlab`), phiên đăng nhập mã hoá bằng `safeStorage` trong `%APPDATA%/UMLab`. Gỡ cài đặt không xoá dữ liệu.
- **Quên mật khẩu** (không có máy chủ gửi email): chủ project / quản trị có chuỗi kết nối chạy

  ```bash
  npm run reset-password -- sinhvien@example.com            # sinh mật khẩu tạm và in ra
  npm run reset-password -- sinhvien@example.com MatKhau123 # đặt mật khẩu cụ thể
  ```

  Công cụ băm argon2id giống app, **tăng `tokenVersion`** (mọi máy đang đăng nhập tài khoản đó bị đăng xuất) và xoá bộ
  đếm đăng nhập sai. Nhắc người dùng đổi mật khẩu trong app (Tài khoản → Đổi mật khẩu).

- **Sao lưu:** bật Cloud Backup của Atlas (M10+) hoặc định kỳ `mongodump --uri "<chuỗi kết nối>" --db umlab`. Ngoài ra
  mỗi máy luôn có bản `.umlab` đầy đủ của các project đã mở; mỗi sơ đồ có **lịch sử 50 phiên bản** (khôi phục trong
  editor).
- **Sự cố thường gặp:**
  - Icon wifi đỏ “Mất kết nối”: kiểm tra mạng / IP Access List; app vẫn dùng được offline, thay đổi tự đồng bộ khi có
    mạng lại (thẻ project hiện “chưa đồng bộ” với project tạo khi offline).
  - Icon vàng: độ trễ tới MongoDB ≥ 600 ms hoặc đang gửi các thay đổi chờ.
  - “Bạn thử quá nhiều lần”: sai mật khẩu 6 lần → chờ 1 phút (hoặc dùng `reset-password`).

## 4. Trang quản trị (web, cổng 5176)

`apps/admin` — trang web xem **tổng quan** (số tài khoản, project, sơ đồ theo loại, số thay đổi 14 ngày, tài khoản hoạt
động, đang online), **danh sách tài khoản** (tìm, tạo tài khoản), **lịch sử từng tài khoản** (tạo tài khoản, đăng nhập /
đăng xuất, đổi / đặt lại mật khẩu, tạo / xoá project, chỉnh sửa theo project × ngày, lưu phiên bản), đặt lại mật khẩu và
đăng xuất mọi nơi. Đọc thẳng cùng database MongoDB với app desktop.

```bash
# .env ở gốc repo: UMLAB_MONGO_URI, UMLAB_DB và UMLAB_ADMIN_EMAILS (hoặc UMLAB_ADMIN_PASSWORD) — xem .env.example
npm run admin                 # chế độ phát triển → http://127.0.0.1:5176 (giao diện tự nạp lại khi sửa code)
npm run admin:build && npm run admin:start   # bản build
```

- **Ai vào được:** tài khoản UMLab có email trong `UMLAB_ADMIN_EMAILS` (mật khẩu của chính tài khoản), hoặc tên `admin`
  với `UMLAB_ADMIN_PASSWORD`. Sai 5 lần → chờ 1 phút. Phiên là cookie HttpOnly, SameSite=Strict, hết hạn sau 8 giờ;
  request ghi cần header `X-UMLab-Admin` (chống CSRF).
- **Chỉ nghe trên máy này** (`127.0.0.1`) theo mặc định. Muốn mở trong mạng LAN: `UMLAB_ADMIN_HOST=0.0.0.0` — khi đó
  đặt `UMLAB_ADMIN_SECRET` cố định và chỉ mở sau tường lửa / VPN (trang không có HTTPS riêng).
- Lịch sử đăng nhập / đổi mật khẩu / tạo-xoá project được app desktop ghi vào collection `audit_log` từ bản này trở đi;
  hoạt động chỉnh sửa trước đó vẫn xem được (lấy từ `project_updates`).
