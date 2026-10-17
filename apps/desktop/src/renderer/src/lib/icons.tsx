import {
  ArrowRightLeft,
  BookOpen,
  Bot,
  Boxes,
  Briefcase,
  Building2,
  Camera,
  Car,
  ChartGantt,
  Cloud,
  Coffee,
  Cpu,
  Database,
  Factory,
  FileText,
  FolderKanban,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Hospital,
  Layers,
  Leaf,
  Music,
  Network,
  Plane,
  Rocket,
  School,
  Server,
  Shield,
  ShoppingCart,
  Smartphone,
  Store,
  Truck,
  UsersRound,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { DiagramGlyph } from './diagram-icons';
import type { DiagramType } from '@umlab/core';

/** Icon project chọn được trong hộp thoại tạo project (~24 icon lucide). */
export const PROJECT_ICONS: Record<string, LucideIcon> = {
  'folder-kanban': FolderKanban,
  car: Car,
  'graduation-cap': GraduationCap,
  'shopping-cart': ShoppingCart,
  'heart-pulse': HeartPulse,
  'building-2': Building2,
  plane: Plane,
  bot: Bot,
  cpu: Cpu,
  cloud: Cloud,
  shield: Shield,
  wallet: Wallet,
  'gamepad-2': Gamepad2,
  'book-open': BookOpen,
  music: Music,
  camera: Camera,
  truck: Truck,
  leaf: Leaf,
  coffee: Coffee,
  rocket: Rocket,
  layers: Layers,
  globe: Globe,
  smartphone: Smartphone,
  server: Server,
  briefcase: Briefcase,
  store: Store,
  hospital: Hospital,
  school: School,
  factory: Factory,
};

export const PROJECT_COLORS = ['#2E62E6', '#1F9D66', '#D98A1C', '#D9463E', '#7C5CC4', '#0E8A9B', '#C2417E', '#475569'];

export const projectIcon = (name: string): LucideIcon => PROJECT_ICONS[name] ?? FolderKanban;

export const DIAGRAM_ICONS: Record<DiagramType, LucideIcon> = {
  usecase: UsersRound,
  'usecase-spec': FileText,
  activity: Workflow,
  sequence: ArrowRightLeft,
  class: Boxes,
  erd: Database,
  architecture: Network,
  gantt: ChartGantt,
};

/** Màu nhấn cho từng loại sơ đồ (thẻ, chip số lượng). */
export const DIAGRAM_COLORS: Record<DiagramType, string> = {
  usecase: '#2E62E6',
  'usecase-spec': '#0E8A9B',
  activity: '#1F9D66',
  sequence: '#7C5CC4',
  class: '#D98A1C',
  erd: '#C2417E',
  architecture: '#4A6FA5',
  gantt: '#D9463E',
};

/** Icon loại sơ đồ: hình thu nhỏ đúng ký hiệu của sơ đồ đó (lib/diagram-icons.tsx). */
export function DiagramIcon({ type, size = 16, colored }: { type: DiagramType; size?: number; colored?: boolean }) {
  if (!DIAGRAM_ICONS[type]) return <FileText size={size} />;
  return <DiagramGlyph type={type} size={size} color={colored ? DIAGRAM_COLORS[type] : 'currentColor'} />;
}
