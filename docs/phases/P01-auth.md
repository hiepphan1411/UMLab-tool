# P01 — Đăng ký, đăng nhập

**Mục tiêu:** vào UMLab bắt buộc đăng nhập; phiên đăng nhập bền, an toàn.

## Backend (`apps/api/src/modules/auth`, `users`)

| Method | Route                    | Mô tả                                                                                                       |
| ------ | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`     | `{ name, email, password }` → tạo user, set cookie, trả `{ user }`                                          |
| POST   | `/api/auth/login`        | `{ email, password, remember }` → set cookie `access` (15p) + `refresh` (7 ngày; 1 ngày nếu không remember) |
| POST   | `/api/auth/refresh`      | Đọc cookie refresh, cấp cặp mới (rotation)                                                                  |
| POST   | `/api/auth/logout`       | Xoá cookie                                                                                                  |
| POST   | `/api/auth/logout-all`   | Tăng `tokenVersion` → mọi phiên hết hạn                                                                     |
| GET    | `/api/auth/me`           | `{ id, name, email }`                                                                                       |
| PATCH  | `/api/users/me`          | Đổi tên                                                                                                     |
| POST   | `/api/users/me/password` | `{ currentPassword, newPassword }` → tăng `tokenVersion`                                                    |

- argon2id; mật khẩu ≥ 8 ký tự, có chữ và số.
- JWT payload `{ sub, tv }` (tv = tokenVersion); guard so `tv` với DB (cache 60s).
- `@nestjs/throttler`: login 5 lần/phút/IP+email; trả lỗi "Bạn thử quá nhiều lần, chờ 1 phút".
- Global `JwtAuthGuard`, decorator `@Public()` cho route công khai.
- Seed: tài khoản demo `demo@umlab.local / Demo1234` (chỉ khi `NODE_ENV=development`).

## Frontend

- `/login`: logo lớn, form email + mật khẩu (hiện/ẩn), "Ghi nhớ đăng nhập", nút Đăng nhập, link "Tạo tài khoản". Lỗi hiển thị dưới form ("Email hoặc mật khẩu không đúng").
- `/register`: họ tên, email, mật khẩu, nhập lại mật khẩu; thanh độ mạnh mật khẩu.
- Bố cục 2 cột trên desktop: trái là form, phải là panel minh hoạ (một sơ đồ UML mẫu vẽ bằng SVG, nền `--accent-soft`); điện thoại chỉ còn form.
- `AuthProvider` + `RequireAuth`: chưa đăng nhập → chuyển `/login?next=…`; đăng nhập xong quay về `next` hoặc `/projects`.
- Interceptor fetch: gặp 401 → gọi `/refresh` một lần rồi thử lại; thất bại → về `/login`.
- Menu tài khoản (avatar chữ cái đầu) trên thanh trên: Hồ sơ, Đổi mật khẩu, Giao diện, Đăng xuất, Đăng xuất mọi thiết bị.

## Tiêu chí nghiệm thu

- Truy cập `/projects` khi chưa đăng nhập → bị chuyển `/login`.
- Đăng ký → vào thẳng `/projects`. F5 vẫn đăng nhập. Đóng trình duyệt, mở lại (có Ghi nhớ) vẫn đăng nhập.
- Đổi mật khẩu → tab khác bị đăng xuất ở request kế tiếp.
- Sai mật khẩu 6 lần → bị chặn 1 phút.
- Jest e2e cho auth controller; Playwright: đăng ký → đăng xuất → đăng nhập.

## Prompt cho Claude Code

```
Đọc CLAUDE.md và docs/phases/P01-auth.md. Thực hiện P01 (backend + frontend auth).
Tuân thủ mục Bảo mật trong CLAUDE.md: không lưu token vào DB, thu hồi bằng tokenVersion.
Viết test như mục Tiêu chí nghiệm thu. Không làm trang projects (chỉ để placeholder "Trang chủ").
```
