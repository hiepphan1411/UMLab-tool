// Class Diagram (`class`) — docs/phases/P08-class.md, docs/spec/notation-class.md.
import { Database } from 'lucide-react';
import { emptyAttribute, uid, type Attribute } from '@umlab/core';
import { Button, useTooltip, type MenuEntry } from '@/ui';
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import type { Engine } from '../engine/engine';
import { createConnectorTx } from '../engine/ops';
import { registerPalette, registerRules, type PaletteItem, type Tx } from '../engine/registry';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import './classifier';
import './others';
import { ABSTRACTION_STEREOTYPES, DEPENDENCY_STEREOTYPES, assocEnds, newEnd } from './connectors';
import { CLASSIFIER, CLASSIFIER_SHAPES, classData, typeTokens } from './model';
import { CLASS_RULES } from './rules';
import { unipkClassTemplate } from './template';

const stereoVariants = (base: string, label: string, list: string[]): PaletteItem[] =>
  list.map((st) => ({
    id: st ? `${base}#${st}` : base,
    label: st ? `${label} «${st}»` : label,
    icon: base === 'cls.dependency' ? 'dependency' : 'abstraction',
    preset: { props: { stereotype: st } },
  }));

const commonC = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-c')!;
const commonD = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-d')!;

registerPalette('class', [
  {
    id: 'cls',
    items: [
      { id: 'cls.class', variants: Object.values(CLASSIFIER).map((c) => ({ id: c.shape })) },
      { id: 'cls.generalization', variants: [{ id: 'cls.generalization' }, { id: 'cls.realization' }] },
      { id: 'cls.usage' },
      {
        id: 'cls.association',
        variants: [
          { id: 'cls.association' },
          {
            id: 'cls.association#directed',
            label: 'Directed Association',
            icon: 'directed-association',
            preset: { props: { directed: true } },
          },
          { id: 'cls.aggregation' },
          { id: 'cls.composition' },
        ],
      },
      { id: 'cls.naryAssoc' },
      { id: 'cls.assocClass' },
      { id: 'cls.dependency', variants: stereoVariants('cls.dependency', 'Dependency', DEPENDENCY_STEREOTYPES) },
      { id: 'cls.abstraction', variants: stereoVariants('cls.abstraction', 'Abstraction', ABSTRACTION_STEREOTYPES) },
      { id: 'cls.collaboration' },
      {
        id: 'common.package#model',
        label: 'Model',
        icon: 'model',
        preset: { props: { kind: 'model' }, model: { name: 'Model' } },
      },
      { id: 'cls.rest' },
    ],
  },
  {
    id: 'cls-notes',
    items: [{ id: 'common.note' }, { id: 'common.anchor' }, { id: 'common.constraint' }, { id: 'common.containment' }],
  },
  { ...commonC, label: undefined },
  { ...commonD, label: undefined },
]);

registerRules('class', CLASS_RULES);

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const MANY = /^(List|Set|Collection|Array|Iterable)$/i;

/** Thuộc tính có kiểu là classifier khác → association (đầu đích navigable, role = tên thuộc tính). */
function attrToAssociation(e: Engine, viewId: string, attr: Attribute, targetModelId: string) {
  e.apply((tx: Tx) => {
    const v = tx.view(viewId);
    if (!v?.modelId) return;
    const m = tx.model(v.modelId)!;
    tx.setModelData(m.id, { attributes: classData(m).attributes.filter((a) => a.id !== attr.id) });
    let target = tx.lookup.views().find((x) => x.modelId === targetModelId);
    if (!target) {
      // class đích chưa có trên sơ đồ này → đặt một hình của chính phần tử đó bên phải
      const tm = tx.model(targetModelId)!;
      const shape = Object.values(CLASSIFIER).find((c) => c.modelKind === tm.kind)?.shape ?? 'cls.class';
      const id = uid('v');
      const z = Math.max(0, ...tx.lookup.views().map((x) => x.z ?? 0)) + 1;
      tx.addView({
        id,
        shape,
        modelId: tm.id,
        x: v.x + v.w + 120,
        y: v.y,
        w: 160,
        h: 70,
        z,
        parentId: v.parentId,
        props: { autoSize: true },
        style: {},
      });
      target = tx.view(id)!;
    }
    const many =
      typeTokens(attr.type).some((t) => MANY.test(t)) ||
      /\*|\.\.[2-9n]/.test(attr.multiplicity) ||
      attr.type.endsWith('[]');
    const c = createConnectorTx(tx, e, 'cls.association', { viewId }, { viewId: target.id });
    if (c?.modelId) {
      const ends = assocEnds(tx.model(c.modelId));
      ends[0] = { ...ends[0], classId: m.id };
      ends[1] = {
        ...ends[1],
        classId: targetModelId,
        role: attr.name,
        multiplicity: attr.multiplicity || (many ? '0..*' : '1'),
        navigable: 'yes',
        visibility: attr.visibility,
      };
      tx.setModelData(c.modelId, { ends });
    }
  });
}

/** Association → thuộc tính của class nguồn (kiểu = class đích; nhiều → List<…>). */
function associationToAttr(e: Engine, connId: string) {
  e.apply((tx) => {
    const c = tx.conn(connId);
    if (!c?.modelId) return;
    const src = tx.view(c.source.viewId ?? '');
    const tgt = tx.view(c.target.viewId ?? '');
    const sm = src?.modelId ? tx.model(src.modelId) : undefined;
    const tm = tgt?.modelId ? tx.model(tgt.modelId) : undefined;
    if (!sm || !tm) return;
    const [, b] = assocEnds(tx.model(c.modelId));
    const many = /\*|\.\.[2-9n]/.test(b.multiplicity);
    const attr: Attribute = {
      ...emptyAttribute(b.role || lowerFirst(tm.name) + (many ? 's' : '')),
      type: many ? `List<${tm.name}>` : tm.name,
      multiplicity: many ? '' : b.multiplicity === '1' ? '' : b.multiplicity,
      visibility: (b.visibility || '-') as Attribute['visibility'],
    };
    tx.setModelData(sm.id, { attributes: [...classData(sm).attributes, attr] });
    tx.deleteConn(c.id);
    tx.deleteModel(c.modelId);
  });
}

function extraMenu(e: Engine, t: { viewId?: string; connId?: string }): MenuEntry[] {
  const out: MenuEntry[] = [];
  if (t.viewId) {
    const v = e.lookup.view(t.viewId);
    const m = v?.modelId ? e.lookup.model(v.modelId) : undefined;
    if (v && m && CLASSIFIER_SHAPES.has(v.shape)) {
      const byName = new Map(
        e.lookup
          .allModel()
          .filter(
            (x) =>
              x.id !== m.id &&
              (x.kind === 'uml.class' ||
                x.kind === 'uml.interface' ||
                x.kind === 'uml.enumeration' ||
                x.kind === 'uml.datatype'),
          )
          .map((x) => [x.name, x]),
      );
      const items = classData(m)
        .attributes.map((a) => ({
          a,
          target: typeTokens(a.type)
            .map((n) => byName.get(n))
            .find(Boolean),
        }))
        .filter((x) => x.target);
      if (items.length)
        out.push(
          {
            label: 'Chuyển thuộc tính thành association',
            children: items.map(({ a, target }) => ({
              label: `${a.name} : ${a.type}`,
              onSelect: () => attrToAssociation(e, v.id, a, target!.id),
            })),
          },
          { type: 'sep' },
        );
    }
  }
  if (t.connId) {
    const c = e.lookup.conn(t.connId);
    if (c?.modelId && e.lookup.model(c.modelId)?.kind === 'uml.association' && !e.readOnly)
      out.push({ label: 'Chuyển thành thuộc tính', onSelect: () => associationToAttr(e, c.id) }, { type: 'sep' });
  }
  return out;
}

function OrmButton() {
  const tip = useTooltip('Có ở bản cập nhật sau (P09)');
  return (
    <span className="inline-flex" {...tip}>
      <Button size="sm" variant="outline" icon={<Database />} disabled>
        Parse ORM → ERD
      </Button>
    </span>
  );
}

registerDiagramTemplates('class', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống', build: () => ({}) },
  {
    id: 'unipark',
    label: 'Class UniPark+',
    description: 'User, SinhVien, Xe, TheRFID, PhienGuiXe, GoiThang, ViDienTu, GiaoDich, ReputationEvent + quan hệ',
    build: () => unipkClassTemplate(),
  },
]);

registerEditor('class', (p) => <CanvasEditor {...p} options={{ extraMenu, toolbar: () => <OrmButton /> }} />);

export { newEnd };
