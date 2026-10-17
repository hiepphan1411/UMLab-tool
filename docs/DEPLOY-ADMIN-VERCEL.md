# Triển khai trang quản trị UMLab lên Vercel

Trang quản trị (`apps/admin`) trên Vercel gồm hai phần:

- **Giao diện** (React, `vite build`) → tệp tĩnh do Vercel phục vụ.
- **API** (`/api/*`) → một Vercel Function (Node.js 22) bọc lại đúng `createApi` của server chạy ở máy
  (`apps/admin/src/server/vercel.ts`). Function kết nối thẳng MongoDB Atlas, **cùng database với app desktop**.

Build theo Build Output API (`apps/admin/scripts/build-vercel.mjs` → `.vercel/output`), cấu hình sẵn trong `vercel.json`
ở gốc repo. Không cần chỉnh gì trong giao diện Vercel ngoài **biến môi trường**.

---

## 1. Chuẩn bị

- Tài khoản [Vercel](https://vercel.com) (gói Hobby miễn phí là đủ), đăng nhập bằng GitHub.
- Code đã **commit + push** lên GitHub (`https://github.com/hiepphan1411/UMLab-tool`). Vercel build từ GitHub, không
  build từ máy.
- MongoDB Atlas đang dùng cho app desktop (chuỗi `UMLAB_MONGO_URI` trong `.env`).

### Mở Network Access của Atlas

Vercel Function chạy trên IP thay đổi liên tục, nên Atlas phải cho phép mọi IP:

**Atlas → Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)**.

App desktop của các thành viên cũng cần mục này (mỗi người một mạng khác nhau). Khi đã mở `0.0.0.0/0`, thứ bảo vệ
database là **user Atlas riêng chỉ có quyền `readWrite` trên database `umlab`** (xem `docs/DEPLOY.md` mục 1) và mật khẩu
mạnh của user đó.

### Tạo khoá ký cookie

Chạy một lần, giữ lại chuỗi in ra (dùng cho `UMLAB_ADMIN_SECRET` ở bước 2):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Tạo project trên Vercel

1. Vào **Vercel → Add New… → Project** → chọn repo **UMLab-tool** → **Import**.
2. Màn hình cấu hình:
   - **Framework Preset:** `Other`.
   - **Root Directory:** để nguyên `./` (gốc repo). Đừng chọn `apps/admin`.
   - **Build and Output Settings:** không bật override nào. Lệnh cài và lệnh build lấy từ `vercel.json`:
     - Install: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 MONGOMS_DISABLE_POSTINSTALL=1 npm ci` (bỏ tải Electron và MongoDB test,
       những thứ chỉ app desktop cần).
     - Build: `npm run admin:vercel`.
3. Mở **Environment Variables**, thêm:

   | Tên                    | Giá trị                                                               | Bắt buộc      |
   | ---------------------- | --------------------------------------------------------------------- | ------------- |
   | `UMLAB_MONGO_URI`      | Chuỗi `mongodb+srv://…` (giống `.env`)                                | Có            |
   | `UMLAB_DB`             | `umlab`                                                               | Có            |
   | `UMLAB_ADMIN_SECRET`   | Chuỗi vừa tạo ở bước 1                                                | Có            |
   | `UMLAB_ADMIN_EMAILS`   | Email tài khoản UMLab được vào trang quản trị, cách nhau dấu phẩy     | Một trong hai |
   | `UMLAB_ADMIN_PASSWORD` | Mật khẩu dự phòng, đăng nhập với tên `admin`. Dùng mật khẩu dài, mạnh | Một trong hai |

4. Bấm **Deploy**. Lần đầu mất khoảng 2–4 phút (cài phụ thuộc của cả repo).
5. Xong sẽ có địa chỉ dạng `https://umlab-tool-xxxx.vercel.app`. Mở ra, đăng nhập bằng email trong
   `UMLAB_ADMIN_EMAILS` (mật khẩu của chính tài khoản đó trong app) hoặc `admin` + `UMLAB_ADMIN_PASSWORD`.

### Nên làm thêm: chọn vùng chạy gần Atlas

**Project → Settings → Functions → Function Region**: chọn vùng gần cluster Atlas (cluster ở Singapore thì chọn
`Singapore (sin1)`). Mặc định Vercel chạy ở Mỹ, mỗi lần gọi API phải vòng qua nửa vòng trái đất tới Atlas nên chậm hẳn.
Đổi xong bấm **Redeploy**.

### Tên miền riêng (tuỳ chọn)

**Project → Settings → Domains → Add**, ví dụ `admin.umlab.vn`, rồi trỏ DNS theo hướng dẫn Vercel hiện ra.

---

## 3. Cập nhật về sau

- **Sửa code:** push lên nhánh `main`, Vercel tự build và triển khai lại. Push nhánh khác hoặc mở Pull Request thì Vercel
  tạo bản **Preview** (địa chỉ riêng) để xem thử trước.
- **Đổi biến môi trường:** sửa trong **Settings → Environment Variables**, sau đó **Deployments → bản mới nhất → ⋯ →
  Redeploy**. Biến mới chỉ có hiệu lực từ lần triển khai sau.
- **Đổi `UMLAB_ADMIN_SECRET`:** mọi người đang đăng nhập trang quản trị bị đăng xuất (cookie cũ không còn hợp lệ).

### Triển khai bằng dòng lệnh (không qua giao diện)

```bash
npx vercel login
npx vercel link                 # chọn / tạo project, thư mục gốc repo
npx vercel env add UMLAB_MONGO_URI production    # lặp lại cho từng biến ở bảng trên
npx vercel --prod               # build trên Vercel và đưa lên production
```

### Kiểm tra build ở máy trước khi push

```bash
npm run admin:vercel            # → .vercel/output (static/ + functions/api.func/)
```

Thư mục `.vercel/` đã nằm trong `.gitignore`, không commit.

---

## 4. Sự cố thường gặp

| Hiện tượng                                                               | Nguyên nhân, cách xử lý                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trang báo `Thiếu biến môi trường UMLAB_ADMIN_SECRET` / `UMLAB_MONGO_URI` | Chưa thêm biến, hoặc thêm rồi nhưng chưa **Redeploy**. Kiểm tra biến có tick môi trường **Production**.                                           |
| `Không kết nối được MongoDB: …`                                          | Atlas chưa mở `0.0.0.0/0` (mục 1), sai mật khẩu trong chuỗi kết nối, hoặc mật khẩu có ký tự đặc biệt chưa mã hoá URL (`@` → `%40`, `#` → `%23`…). |
| `Chưa cấu hình quản trị…` khi đăng nhập                                  | Thiếu cả `UMLAB_ADMIN_EMAILS` lẫn `UMLAB_ADMIN_PASSWORD`.                                                                                         |
| Đăng nhập đúng nhưng vẫn quay lại màn đăng nhập                          | Đang mở bằng `http://` (cookie có cờ `Secure` chỉ gửi qua HTTPS). Dùng địa chỉ `https://…vercel.app`.                                             |
| Build lỗi khi tải Electron hoặc MongoDB                                  | Ô Install Command trên Vercel đang bị override. Tắt override để dùng lệnh trong `vercel.json`.                                                    |
| Build lỗi `npm ci … lock file`                                           | `package-lock.json` chưa khớp `package.json`. Chạy `npm install` ở máy, commit cả `package-lock.json`.                                            |
| API chậm (1–2 giây mỗi lần bấm)                                          | Function chạy xa Atlas → đổi Function Region (mục 2). Lần gọi đầu sau một lúc không dùng luôn chậm hơn (khởi động lạnh, mở kết nối Atlas).        |

---

## 5. Lưu ý bảo mật

- Trang quản trị trên Vercel **công khai trên Internet**: ai biết địa chỉ cũng mở được màn đăng nhập. Dùng mật khẩu mạnh
  cho `UMLAB_ADMIN_PASSWORD` và cho các tài khoản trong `UMLAB_ADMIN_EMAILS`.
- Giới hạn "sai 5 lần chờ 1 phút" được đếm trong bộ nhớ từng instance. Trên Vercel có thể có nhiều instance cùng lúc nên
  giới hạn này yếu hơn khi chạy ở máy. Mật khẩu mạnh là lớp bảo vệ chính.
- Không đưa `.env` lên GitHub (đã có trong `.gitignore`). Chuỗi kết nối chỉ nằm trong Environment Variables của Vercel.
- Request ghi vẫn cần header `X-UMLab-Admin`, cookie vẫn là `HttpOnly; SameSite=Strict`, qua HTTPS thì thêm `Secure`.

---

## Phụ lục: phát app desktop (.exe) cho thành viên

1. Ở máy có `.env` đúng: `npm run dist` → `apps/desktop/release/<version>/`
   - `UMLab-Setup-<version>.exe`: bộ cài (chọn thư mục cài, tạo shortcut Desktop và Start Menu).
   - `UMLab-Portable-<version>.exe`: chạy luôn, không cần cài.
2. Gửi tệp cho thành viên (Google Drive, Zalo, GitHub Releases…). Chuỗi kết nối MongoDB đã nhúng trong bản build, nên chỉ
   gửi trong nhóm.
3. Khi mở bộ cài, Windows có thể hiện **"Windows protected your PC"** (bộ cài chưa có chữ ký số): bấm **More info →
   Run anyway**.
4. Đăng nhập bằng tài khoản quản trị tạo cho từng người (trang quản trị → Tài khoản → Tạo tài khoản), bằng email hoặc tên
   đăng nhập.
5. Phát bản mới: tăng `version` trong `apps/desktop/package.json` rồi `npm run dist` lại. Thành viên chạy bộ cài mới,
   cài đè lên bản cũ, dữ liệu vẫn giữ nguyên.
