// Tệp sinh tự động bởi scripts/build.mjs — không sửa tay. Icon gốc ở icons/*.svg (16×16).
export const UML_ICONS: Record<string, string> = {
  "cursor": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linejoin=\"round\"><path d=\"M3.5 2.5 12 8.2l-3.7.8 2.2 4.3-1.6.8-2.2-4.3-2.7 2.6z\" fill=\"var(--uml-ic-bg,#FFFFFF)\"/></svg>",
  "hand": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5.5 8V3.6a1 1 0 0 1 2 0V7.5M7.5 7V2.8a1 1 0 0 1 2 0V7M9.5 7V3.6a1 1 0 0 1 2 0v5.2c0 2.9-1.8 4.7-4.3 4.7-1.6 0-2.6-.7-3.5-2L2.4 9.3a1 1 0 0 1 1.5-1.3L5.5 9.5\"/></svg>",
  "lasso": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.6\"><path d=\"M3 9.5C1.6 7.6 2.6 3.5 7.6 3s7 2.6 5.6 4.8-5.2 2.6-7.4 1.9\"/><path d=\"M5.6 9.6c-1.1.9-1 2.6.3 3.4\" stroke-dasharray=\"none\"/></svg>",
  "missing": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"var(--uml-ic-line,#64748B)\" stroke-width=\"1.25\"><rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"2\" stroke-dasharray=\"2 1.5\"/></svg>",
};

export type UmlIconName = keyof typeof UML_ICONS;

export function umlIcon(name: string): string {
  return UML_ICONS[name] ?? UML_ICONS['missing'] ?? '';
}
