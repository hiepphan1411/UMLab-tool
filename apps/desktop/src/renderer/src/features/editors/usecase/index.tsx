// Use Case Diagram (`usecase`) — docs/phases/P06-usecase.md, docs/spec/notation-usecase.md.
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import { registerPalette, registerRules } from '../engine/registry';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import './shapes';
import './connectors';
import { USECASE_RULES } from './rules';
import { unipkUseCaseTemplate } from './template';

registerPalette('usecase', [
  {
    id: 'uc',
    items: [
      { id: 'uc.usecase' },
      { id: 'uc.association' },
      { id: 'uc.actor' },
      { id: 'uc.system' },
      { id: 'uc.include' },
      { id: 'uc.extend' },
      { id: 'uc.dependency' },
      { id: 'uc.generalization', variants: [{ id: 'uc.generalization' }, { id: 'uc.realization' }] },
      { id: 'uc.collaboration' },
    ],
  },
  ...COMMON_PALETTE_GROUPS,
]);

registerRules('usecase', USECASE_RULES);

registerDiagramTemplates('usecase', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống', build: () => ({}) },
  {
    id: 'unipark',
    label: 'Use case UniPark+',
    description:
      'Sinh viên, Bảo vệ, Quản trị viên, Thiết bị cổng; Đăng nhập, Check-in, Check-out, Nạp ví, Mua gói tháng…',
    build: () => unipkUseCaseTemplate(),
  },
]);

registerEditor('usecase', (p) => <CanvasEditor {...p} />);
