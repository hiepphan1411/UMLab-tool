// Preset màu của sơ đồ kiến trúc (giữ nguyên tool cũ).
export interface CardIcon {
  k: string;
  c?: string;
  sw?: number;
}

/** 6 màu nhóm và 6 kiểu thẻ nhanh của tool cũ. */
export const GROUP_PRESETS = [
  { n: 'Xanh dương', fill: '#E6EEF8', stroke: '#6E8FBF' },
  { n: 'Xám', fill: '#ECEAE6', stroke: '#B5B0A8' },
  { n: 'Cam', fill: '#F9EBDD', stroke: '#E0B08A' },
  { n: 'Tím', fill: '#EEE5F4', stroke: '#A98BC4' },
  { n: 'Xanh lá', fill: '#E6F3EA', stroke: '#7DB58F' },
  { n: 'Đỏ', fill: '#FBE9E6', stroke: '#D9897D' },
];
export const NODE_PRESETS = [
  { n: 'Viền xanh', fill: '#FFFFFF', stroke: '#4A6FA5', ic: '#3B5F94' },
  { n: 'Module cam', fill: '#FCE4D0', stroke: '#E1A06F', ic: '#B8652F' },
  { n: 'Viền xám', fill: '#FFFFFF', stroke: '#A9A49C', ic: '#475569' },
  { n: 'Viền tím', fill: '#FFFFFF', stroke: '#6B5B95', ic: '#7A4FA8' },
  { n: 'Viền xanh lá', fill: '#FFFFFF', stroke: '#3F9A4F', ic: '#2F7D3E' },
  { n: 'Viền đỏ', fill: '#FFFFFF', stroke: '#C8473A', ic: '#B23A2E' },
];
