// Một mã nguồn, hai app: UMLab (đầy đủ) và "UMLab VSTEP" (chỉ mục Ôn thi VSTEP).
// Chọn lúc build: `electron-vite build --mode vstep` → define __APP_MODE__ = 'vstep' (xem electron.vite.config.ts).
declare const __APP_MODE__: string | undefined;

export type AppMode = 'umlab' | 'vstep';

export const APP_MODE: AppMode = typeof __APP_MODE__ !== 'undefined' && __APP_MODE__ === 'vstep' ? 'vstep' : 'umlab';
export const IS_VSTEP_APP = APP_MODE === 'vstep';

/** Trang mở đầu sau khi đăng nhập. */
export const HOME_PATH = IS_VSTEP_APP ? '/vstep' : '/projects';

export const APP_TITLE = IS_VSTEP_APP ? 'Ôn thi VSTEP' : 'UMLab';
