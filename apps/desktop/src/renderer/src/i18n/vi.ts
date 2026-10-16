// Chuỗi giao diện dùng chung. Chuỗi riêng của từng màn hình đặt cạnh component (vẫn là tiếng Việt).
export const vi = {
  app: { name: 'UMLab', tagline: 'Vẽ và quản lý mô hình phân tích thiết kế phần mềm' },
  common: {
    cancel: 'Huỷ',
    save: 'Lưu',
    close: 'Đóng',
    delete: 'Xoá',
    rename: 'Đổi tên',
    duplicate: 'Nhân bản',
    open: 'Mở',
    create: 'Tạo',
    search: 'Tìm kiếm',
    exportJson: 'Xuất JSON',
    importJson: 'Nhập JSON',
    retry: 'Thử lại',
  },
  theme: { auto: 'Theo hệ thống', light: 'Sáng', dark: 'Tối', label: 'Giao diện' },
  roles: { owner: 'Chủ project', editor: 'Chỉnh sửa', viewer: 'Chỉ xem' },
  conn: {
    online: 'Đã kết nối',
    offline: 'Mất kết nối',
    connecting: 'Đang kết nối…',
    unconfigured: 'Chưa cấu hình',
    pending: (n: number) => `${n} thay đổi chờ gửi`,
    polling: 'Chế độ hỏi vòng (không realtime)',
  },
} as const;
