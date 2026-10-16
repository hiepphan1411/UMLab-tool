# @umlab/uml-icons

Icon palette UML 16×16 tự vẽ (không dùng asset của Visual Paradigm).

Quy ước màu (biến CSS có giá trị dự phòng để file .svg vẫn xem được độc lập):

| Vai trò                                     | Giá trị                        |
| ------------------------------------------- | ------------------------------ |
| Nét chính (hình người, chữ, nét trung tính) | `currentColor`                 |
| Phần tử UML                                 | `var(--uml-ic-accent,#2E62E6)` |
| Nền ô tô màu nhạt                           | `var(--uml-ic-fill,#E7EEFD)`   |
| Đường nối / hình chung                      | `var(--uml-ic-line,#64748B)`   |
| Nền trắng                                   | `var(--uml-ic-bg,#FFFFFF)`     |

Nét 1.25px. Thêm icon: tạo `icons/<ten>.svg` có `viewBox="0 0 16 16"` rồi chạy `npm run icons` ở thư mục gốc (sinh `src/index.ts`).
Xem trước: `npm run preview -w @umlab/uml-icons`.
