import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_LABEL, useTheme } from '@/lib/theme';
import { IconButton, toast } from '@/ui';

export function ThemeButton() {
  const { mode, cycle } = useTheme();
  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
  return (
    <IconButton
      label={`Giao diện: ${THEME_LABEL[mode]} (bấm để đổi)`}
      onClick={() => {
        const n = cycle();
        toast('Giao diện: ' + THEME_LABEL[n]);
      }}
    >
      <Icon />
    </IconButton>
  );
}
