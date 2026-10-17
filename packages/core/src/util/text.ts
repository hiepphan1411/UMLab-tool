/** Bỏ dấu tiếng Việt. */
export const unaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** Chuỗi để so khớp tìm kiếm: không dấu, chữ thường, gộp khoảng trắng. */
export const searchKey = (s: string) => unaccent(s).toLowerCase().replace(/\s+/g, ' ').trim();
