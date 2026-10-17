// Dữ liệu phần tử mô hình của Class Diagram (docs/spec/notation-class.md mục 1).
import type { Attribute, ModelElement, Operation } from '@umlab/core';
import type { EngineLookup } from '../engine/registry';

export type ClassifierKind = 'class' | 'interface' | 'enumeration' | 'datatype' | 'primitive' | 'signal';

export const CLASSIFIER: Record<
  ClassifierKind,
  { shape: string; modelKind: string; label: string; stereotype: string; icon: string }
> = {
  class: { shape: 'cls.class', modelKind: 'uml.class', label: 'Class', stereotype: '', icon: 'class' },
  interface: {
    shape: 'cls.interface',
    modelKind: 'uml.interface',
    label: 'Interface',
    stereotype: 'interface',
    icon: 'interface',
  },
  enumeration: {
    shape: 'cls.enum',
    modelKind: 'uml.enumeration',
    label: 'Enumeration',
    stereotype: 'enumeration',
    icon: 'enumeration',
  },
  datatype: {
    shape: 'cls.datatype',
    modelKind: 'uml.datatype',
    label: 'Data Type',
    stereotype: 'dataType',
    icon: 'datatype',
  },
  primitive: {
    shape: 'cls.primitive',
    modelKind: 'uml.primitive',
    label: 'Primitive Type',
    stereotype: 'primitive',
    icon: 'primitive',
  },
  signal: { shape: 'cls.signal', modelKind: 'uml.signal', label: 'Signal', stereotype: 'signal', icon: 'signal' },
};

/** Các model kind là classifier (đích hợp lệ của association, kiểu thuộc tính). */
export const CLASSIFIER_KINDS = new Set([...Object.values(CLASSIFIER).map((c) => c.modelKind), 'uml.associationClass']);
export const CLASSIFIER_SHAPES = new Set([...Object.values(CLASSIFIER).map((c) => c.shape), 'cls.assocClass']);

export interface Literal {
  id: string;
  name: string;
}

export interface ClassData {
  stereotypes: string[];
  visibility: '+' | '-' | '#' | '~';
  isAbstract: boolean;
  isLeaf: boolean;
  isActive: boolean;
  templateParams: { name: string; type?: string }[];
  attributes: Attribute[];
  operations: Operation[];
  literals: Literal[];
  documentation: string;
}

export const emptyClassData = (): ClassData => ({
  stereotypes: [],
  visibility: '+',
  isAbstract: false,
  isLeaf: false,
  isActive: false,
  templateParams: [],
  attributes: [],
  operations: [],
  literals: [],
  documentation: '',
});

export function classData(m: ModelElement | null | undefined): ClassData {
  const d = (m?.data ?? {}) as Partial<ClassData>;
  const e = emptyClassData();
  return {
    stereotypes: Array.isArray(d.stereotypes) ? d.stereotypes : e.stereotypes,
    visibility: d.visibility ?? e.visibility,
    isAbstract: !!d.isAbstract,
    isLeaf: !!d.isLeaf,
    isActive: !!d.isActive,
    templateParams: Array.isArray(d.templateParams) ? d.templateParams : [],
    attributes: Array.isArray(d.attributes) ? d.attributes : [],
    operations: Array.isArray(d.operations) ? d.operations : [],
    literals: Array.isArray(d.literals) ? d.literals : [],
    documentation: typeof d.documentation === 'string' ? d.documentation : '',
  };
}

export const BUILTIN_TYPES = [
  'String',
  'int',
  'long',
  'double',
  'float',
  'boolean',
  'Date',
  'DateTime',
  'UUID',
  'Decimal',
  'byte[]',
  'void',
  'List<T>',
  'Set<T>',
  'Map<K, V>',
  'Integer',
  'Long',
  'Boolean',
  'Double',
  'BigDecimal',
  'LocalDate',
  'LocalDateTime',
  'Instant',
  'number',
  'string',
  'object',
  'any',
  'char',
  'short',
  'Object',
  'T',
  'K',
  'V',
];
const BUILTIN = new Set(BUILTIN_TYPES.map((t) => t.replace(/<.*$/, '').toLowerCase()));

/** Tên các classifier trong project. */
export function classifierNames(lookup: EngineLookup): string[] {
  return [
    ...new Set(
      lookup
        .allModel()
        .filter((m) => CLASSIFIER_KINDS.has(m.kind))
        .map((m) => m.name),
    ),
  ].sort();
}

/** Các tên kiểu đơn trong một biểu thức kiểu: `List<Xe>` → [List, Xe]; `Map<String, Xe[]>` → [Map, String, Xe]. */
export function typeTokens(type: string): string[] {
  return (type.match(/[A-Za-z_À-ỹ][\wÀ-ỹ.]*/g) ?? []).filter(Boolean);
}

/** Kiểu không tồn tại (không phải kiểu cơ bản / tham số template / classifier của project). */
export function unknownTypes(type: string, known: Set<string>, templateParams: string[] = []): string[] {
  if (!type.trim()) return [];
  return typeTokens(type).filter((t) => !BUILTIN.has(t.toLowerCase()) && !known.has(t) && !templateParams.includes(t));
}

/**
 * Gợi ý kiểu khi gõ sau dấu `:` (thuộc tính, kiểu trả về) hoặc `p :` (tham số).
 * Trả về vị trí bắt đầu của từ đang gõ và danh sách khớp.
 */
export function suggestTypes(lookup: EngineLookup, line: string): { from: number; items: string[] } | null {
  const i = line.lastIndexOf(':');
  if (i < 0) return null;
  const after = line.slice(i + 1);
  // đang gõ phần sau kiểu (multiplicity, =, {) → thôi gợi ý
  if (/[[\]={}()]/.test(after)) return null;
  const lead = after.length - after.trimStart().length;
  const word = after.trimStart();
  const from = i + 1 + lead;
  const q = word.toLowerCase();
  const all = [...classifierNames(lookup), ...BUILTIN_TYPES];
  const items = [...new Set(all)].filter((t) => t.toLowerCase().startsWith(q) && t !== word);
  if (!items.length) return null;
  return { from, items: items.slice(0, 8) };
}
