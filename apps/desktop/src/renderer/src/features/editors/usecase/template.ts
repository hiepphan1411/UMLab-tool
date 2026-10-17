// Mẫu "Use case UniPark+" khi tạo Use Case Diagram mới.
import { uid, type Connector, type ModelElement, type View } from '@umlab/core';
import type { DiagramInit } from '../editor-registry';

export function unipkUseCaseTemplate(): DiagramInit {
  const views: View[] = [];
  const model: ModelElement[] = [];
  const connectors: Connector[] = [];
  let z = 0;
  const sysId = uid('v');
  const sysM: ModelElement = { id: uid('m'), kind: 'uml.subject', name: 'Hệ thống UniPark+', data: {} };
  model.push(sysM);
  views.push({
    id: sysId,
    shape: 'uc.system',
    modelId: sysM.id,
    x: 250,
    y: 30,
    w: 520,
    h: 700,
    z: -1,
    parentId: null,
    props: {},
    style: {},
  });
  let code = 0;
  const eps: Record<string, { id: string; name: string }[]> = {};
  const uc = (name: string, x: number, y: number, extPoints: string[] = []) => {
    const m: ModelElement = {
      id: uid('m'),
      kind: 'uml.usecase',
      name,
      data: {
        code: 'UC' + String(++code).padStart(2, '0'),
        description: '',
        rank: 'medium',
        status: 'proposed',
        isBusiness: false,
        extensionPoints: extPoints.map((n) => ({ id: uid('ep'), name: n })),
        specDiagramId: null,
      },
    };
    eps[name] = m.data.extensionPoints as { id: string; name: string }[];
    model.push(m);
    const id = uid('v');
    const h = extPoints.length ? 92 : 64;
    views.push({
      id,
      shape: 'uc.usecase',
      modelId: m.id,
      x,
      y,
      w: 190,
      h,
      z: z++,
      parentId: sysId,
      props: { showExtensionPoints: true, showCode: true },
      style: {},
    });
    return id;
  };
  const actor = (name: string, x: number, y: number, type: string) => {
    const m: ModelElement = {
      id: uid('m'),
      kind: 'uml.actor',
      name,
      data: { description: '', isBusiness: false, type },
    };
    model.push(m);
    const id = uid('v');
    views.push({
      id,
      shape: 'uc.actor',
      modelId: m.id,
      x,
      y,
      w: 46,
      h: 96,
      z: z++,
      parentId: null,
      props: { display: 'stick' },
      style: {},
    });
    return id;
  };
  const conn = (kind: string, a: string, b: string, props: Record<string, unknown> = {}) =>
    connectors.push({
      id: uid('c'),
      kind,
      modelId: null,
      source: { viewId: a },
      target: { viewId: b },
      routing: 'straight',
      waypoints: [],
      labels: [],
      props,
      style: {},
      z: z++,
    });

  const login = uc('Đăng nhập', 290, 80);
  const checkin = uc('Check-in xe vào bãi', 290, 180);
  const checkout = uc('Check-out xe ra bãi', 290, 280);
  const topup = uc('Nạp ví điện tử', 290, 400);
  const monthly = uc('Mua gói tháng', 290, 500);
  const complain = uc('Khiếu nại vi phạm', 290, 610);
  const otp = uc('Xác thực OTP', 540, 80);
  const pay = uc('Thanh toán phí gửi xe', 540, 300, ['Số dư không đủ']);
  const users = uc('Quản lý người dùng', 540, 500);
  const history = uc('Xem lịch sử gửi xe', 540, 610);

  const sv = actor('Sinh viên', 90, 300, 'user');
  const guard = actor('Bảo vệ', 90, 560, 'user');
  const admin = actor('Quản trị viên', 880, 520, 'user');
  const gate = actor('Thiết bị cổng', 880, 170, 'device');

  for (const u of [login, checkin, checkout, topup, monthly, complain]) conn('uc.association', sv, u);
  conn('uc.association', guard, checkin);
  conn('uc.association', guard, checkout);
  conn('uc.association', guard, complain);
  conn('uc.association', admin, users);
  conn('uc.association', admin, history);
  conn('uc.association', admin, login);
  conn('uc.association', gate, checkin);
  conn('uc.association', gate, checkout);
  conn('uc.include', login, otp);
  conn('uc.include', checkout, pay);
  conn('uc.include', monthly, pay);
  conn('uc.extend', topup, pay, {
    condition: 'số dư ví không đủ',
    extensionPoint: eps['Thanh toán phí gửi xe'][0].id,
    showNote: true,
  });
  return { views, connectors, model };
}
