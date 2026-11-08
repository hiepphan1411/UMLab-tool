// Sinh từ OCR sách "Ôn tổng hợp VSTEP bậc 3 (B1)": track → trang sách (book) và trang lời thoại/đáp án (keys).
// Trang lời thoại là gần đúng (OCR không đọc được nhãn track) — trong trình xem có nút lật trang.
export interface BookTrack {
  n: number;
  file: string;
  skill: 'listening' | 'speaking';
  group: string;
  groupTitle: string;
  label: string;
  page: number;
  script: number;
  answer: number | null;
}

export const TRACK_GROUPS: {
  code: string;
  title: string;
  from: number;
  to: number;
  skill: 'listening' | 'speaking';
}[] = [
  {
    code: 'L1.1',
    title: 'Part 1 – Câu hỏi tổng quan (địa điểm, người nói, chủ đề, hoạt động)',
    from: 1,
    to: 7,
    skill: 'listening',
  },
  {
    code: 'L1.2',
    title: 'Part 1 – Câu hỏi chi tiết (thời gian, địa điểm, lý do, yêu cầu)',
    from: 8,
    to: 14,
    skill: 'listening',
  },
  { code: 'L1.3', title: 'Part 1 – Từ đánh lạc hướng', from: 15, to: 19, skill: 'listening' },
  { code: 'L2.1', title: 'Part 2&3 – Nhận biết ý chính', from: 20, to: 30, skill: 'listening' },
  { code: 'L2.2', title: 'Part 2&3 – Nhận biết mục đích chính', from: 31, to: 39, skill: 'listening' },
  { code: 'L2.3', title: 'Part 2&3 – Nhận biết chi tiết', from: 40, to: 47, skill: 'listening' },
  { code: 'L2.4', title: 'Part 2&3 – Cách diễn đạt khác', from: 48, to: 54, skill: 'listening' },
  { code: 'L3.1', title: 'Mở rộng – Câu hỏi suy luận', from: 55, to: 60, skill: 'listening' },
  { code: 'L3.2', title: 'Mở rộng – Mục đích/chức năng diễn ngôn', from: 61, to: 64, skill: 'listening' },
  { code: 'S1.1', title: 'Nói – Phát âm cơ bản', from: 65, to: 69, skill: 'speaking' },
  { code: 'S1', title: 'Nói Part 1 – Ý tưởng, ngữ pháp, bài mẫu', from: 70, to: 73, skill: 'speaking' },
  { code: 'S2', title: 'Nói Part 2 – Thảo luận giải pháp', from: 74, to: 78, skill: 'speaking' },
  { code: 'S3', title: 'Nói Part 3 – Phát triển chủ đề', from: 79, to: 89, skill: 'speaking' },
];

const RAW: [number, number, string, number, number | null][] = [
  [1, 27, '', 2, 2],
  [2, 30, 'L1.1 EX2', 2, 2],
  [3, 33, '', 2, 2],
  [4, 36, '', 10, 2],
  [5, 37, 'L1.1 EX5', 12, 2],
  [6, 39, 'L1.1 EX5', 15, 3],
  [7, 40, '', 15, 3],
  [8, 42, '', 16, 3],
  [9, 43, '', 18, 3],
  [10, 45, '', 19, 3],
  [11, 47, '', 21, 3],
  [12, 49, 'L1.2 EX5', 22, 3],
  [13, 50, 'L1.2 EX5', 22, 3],
  [14, 52, '', 23, 3],
  [15, 53, '', 25, 4],
  [16, 55, '', 26, 4],
  [17, 57, '', 28, 4],
  [18, 58, '', 29, 4],
  [19, 59, '', 29, 4],
  [20, 63, 'L2.1 EX1', 29, 4],
  [21, 64, 'L2.1 EX2', 29, 4],
  [22, 64, 'L2.1 EX2', 29, 4],
  [23, 65, 'L2.1 EX3', 29, 4],
  [24, 66, 'L2.1 EX3', 29, 5],
  [25, 67, 'L2.1 EX3', 29, 5],
  [26, 67, 'L2.1 EX3', 29, 5],
  [27, 67, 'L2.1 EX3', 29, 5],
  [28, 68, 'L2.1 EX5', 29, 5],
  [29, 69, 'L2.1 EX6', 32, 5],
  [30, 70, 'L2.1 EX7', 32, 5],
  [31, 73, 'L2.2 EX2', 32, 5],
  [32, 73, 'L2.2 EX2', 33, 5],
  [33, 73, 'L2.2 EX2', 33, 6],
  [34, 74, 'L2.2 EX3', 34, 6],
  [35, 74, 'L2.2 EX3', 34, 6],
  [36, 75, 'L2.2 EX4', 34, 6],
  [37, 75, 'L2.2 EX4', 36, 6],
  [38, 76, 'L2.2 EX5', 37, 6],
  [39, 77, 'L2.2 EX6', 37, 6],
  [40, 79, 'L2.3 EX1', 37, 6],
  [41, 79, 'L2.3 EX1', 37, 6],
  [42, 79, 'L2.3 EX1', 37, 7],
  [43, 80, 'L2.3 EX2', 38, 7],
  [44, 80, 'L2.3 EX2', 38, 7],
  [45, 81, 'L2.3 EX4', 39, 7],
  [46, 82, 'L2.3 EX5', 40, 7],
  [47, 82, 'L2.3 EX5', 40, 7],
  [48, 86, 'L2.4 EX1', 40, 7],
  [49, 87, 'L2.4 EX1', 41, 7],
  [50, 87, 'L2.4 EX1', 41, 7],
  [51, 88, 'L2.4 EX3', 42, 8],
  [52, 88, 'L2.4 EX3', 43, 8],
  [53, 89, 'L2.4 EX5', 44, 8],
  [54, 90, 'L2.4 EX6', 44, 8],
  [55, 94, 'L3.1 EX1', 45, 8],
  [56, 95, 'L3.1 EX2', 46, 8],
  [57, 96, 'L3.1 EX3', 47, 8],
  [58, 98, 'L3.1 EX4', 48, 8],
  [59, 99, 'L3.1 EX5', 48, 8],
  [60, 100, 'L3.1 EX6', 49, 9],
  [61, 106, 'L3.2 EX1', 50, 9],
  [62, 107, 'L3.2 EX2', 51, 9],
  [63, 108, 'L3.2 EX3', 52, 9],
  [64, 110, 'L3.2 EX4', 53, 9],
  [65, 301, '', 73, null],
  [66, 302, '', 75, null],
  [67, 302, '', 76, null],
  [68, 303, '', 78, null],
  [69, 304, '', 79, null],
  [70, 312, '', 81, null],
  [71, 317, '', 82, null],
  [72, 320, '', 82, null],
  [73, 323, '', 82, null],
  [74, 329, '', 82, null],
  [75, 332, '', 82, null],
  [76, 333, '', 83, null],
  [77, 334, '', 83, null],
  [78, 340, '', 83, null],
  [79, 341, '', 84, null],
  [80, 346, '', 84, null],
  [81, 351, '', 84, null],
  [82, 352, '', 84, null],
  [83, 353, '', 85, null],
  [84, 354, '', 85, null],
  [85, 354, '', 85, null],
  [86, 355, '', 86, null],
  [87, 356, '', 86, null],
  [88, 363, '', 86, null],
  [89, 366, '', 86, null],
];

export const BOOK_TRACKS: BookTrack[] = RAW.map(([n, page, label, script, answer]) => {
  const g = TRACK_GROUPS.find((x) => n >= x.from && n <= x.to)!;
  return {
    n,
    file: `${String(n).padStart(2, '0')}-VSTEP-BAC-3-B1.mp3`,
    skill: g.skill,
    group: g.code,
    groupTitle: g.title,
    label: label || g.code,
    page,
    script,
    answer,
  };
});

export const BOOK_PAGES = 366;
export const KEY_PAGES = 88;
export const bookPage = (p: number) => `_umlab/book/p${String(p).padStart(3, '0')}.jpg`;
export const keyPage = (p: number) => `_umlab/keys/k${String(p).padStart(3, '0')}.jpg`;
