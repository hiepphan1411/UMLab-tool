import { newId } from './util';

/** Mỗi lần chạy app là một client — dùng để bỏ qua dữ liệu của chính mình trong change stream và làm khoá presence. */
export const CLIENT_ID = newId('c', 10);
