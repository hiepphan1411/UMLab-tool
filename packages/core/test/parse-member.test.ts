import { describe, expect, it } from 'vitest';
import {
  editAttribute,
  editOperation,
  formatAttribute,
  formatOperation,
  parseAttribute,
  parseMember,
  parseOperation,
  splitTop,
} from '../src';

const attr = (s: string) => {
  const r = parseMember(s);
  if (r?.kind !== 'attribute') throw new Error('không phải thuộc tính: ' + s);
  return r.attr;
};
const op = (s: string) => {
  const r = parseMember(s);
  if (r?.kind !== 'operation') throw new Error('không phải phương thức: ' + s);
  return r.op;
};

describe('parseMember — thuộc tính', () => {
  it('đủ trường: - bienSo : String [1] {unique}', () => {
    const a = attr('- bienSo : String [1] {unique}');
    expect(a).toMatchObject({
      visibility: '-',
      name: 'bienSo',
      type: 'String',
      multiplicity: '1',
      constraints: ['unique'],
      isStatic: false,
      isDerived: false,
    });
    expect(formatAttribute(a)).toBe('- bienSo : String [1] {unique}');
  });
  it('multiplicity khoảng + ordered: # items : Item [0..*] {ordered}', () => {
    const a = attr('# items : Item [0..*] {ordered}');
    expect(a).toMatchObject({
      visibility: '#',
      name: 'items',
      type: 'Item',
      multiplicity: '0..*',
      constraints: ['ordered'],
    });
  });
  it('$ là static, có giá trị mặc định: + $MAX : int = 10', () => {
    const a = attr('+ $MAX : int = 10');
    expect(a).toMatchObject({ visibility: '+', name: 'MAX', type: 'int', default: '10', isStatic: true });
    expect(formatAttribute(a)).toBe('+ MAX : int = 10');
    expect(editAttribute(a)).toBe('+ $MAX : int = 10');
  });
  it('/ là derived: /age : int', () => {
    const a = attr('/age : int');
    expect(a).toMatchObject({ name: 'age', type: 'int', isDerived: true, visibility: '-' });
    expect(formatAttribute(a)).toBe('- /age : int');
  });
  it('không có kiểu', () => expect(attr('ten')).toMatchObject({ name: 'ten', type: '', multiplicity: '' }));
  it('kiểu generic có dấu phẩy: Map<String, List<Integer>>', () =>
    expect(attr('- cache : Map<String, List<Integer>>').type).toBe('Map<String, List<Integer>>'));
  it('kiểu mảng không phải multiplicity: byte[]', () =>
    expect(attr('- data : byte[]')).toMatchObject({ type: 'byte[]', multiplicity: '' }));
  it('multiplicity viết liền: tags : String[*]', () =>
    expect(attr('tags : String[*]')).toMatchObject({ type: 'String', multiplicity: '*' }));
  it('chuỗi mặc định có dấu =: - note : String = "a=b"', () =>
    expect(attr('- note : String = "a=b"').default).toBe('"a=b"'));
  it('readOnly + id: - id : UUID {id, readOnly}', () => {
    const a = attr('- id : UUID {id, readOnly}');
    expect(a).toMatchObject({ isReadOnly: true, constraints: ['id'] });
    expect(formatAttribute(a)).toBe('- id : UUID {id, readOnly}');
  });
  it('stereotype: «PK» - ma : long', () =>
    expect(attr('«PK» - ma : long')).toMatchObject({ stereotypes: ['PK'], name: 'ma', type: 'long' }));
  it('stereotype kiểu <<...>>', () => expect(attr('<<transient>> tam : int').stereotypes).toEqual(['transient']));
  it('khoảng trắng thừa', () =>
    expect(attr('  -   soDu   :   Decimal   [0..1]  ')).toMatchObject({
      name: 'soDu',
      type: 'Decimal',
      multiplicity: '0..1',
    }));
  it('giữ id cũ khi sửa', () => expect(parseAttribute('- a : int', { id: 'a_old' })!.id).toBe('a_old'));
  it('{static} như $', () => expect(attr('- dem : int {static}').isStatic).toBe(true));
  it('dòng rỗng → null', () => expect(parseMember('   ')).toBeNull());
});

describe('parseMember — phương thức', () => {
  it('+ getTotal() : Decimal', () => {
    const o = op('+ getTotal() : Decimal');
    expect(o).toMatchObject({ visibility: '+', name: 'getTotal', params: [], returnType: 'Decimal' });
    expect(formatOperation(o)).toBe('+ getTotal() : Decimal');
  });
  it('tham số có hướng, kiểu, mặc định', () => {
    const o = op('- tinhPhi(in gioVao : DateTime, out phi : Decimal, giam : int = 0) : void');
    expect(o.params).toEqual([
      { name: 'gioVao', type: 'DateTime', direction: 'in' },
      { name: 'phi', type: 'Decimal', direction: 'out' },
      { name: 'giam', type: 'int', direction: 'in', default: '0' },
    ]);
    expect(formatOperation(o)).toBe('- tinhPhi(gioVao : DateTime, out phi : Decimal, giam : int = 0) : void');
  });
  it('tham số kiểu generic có dấu phẩy', () =>
    expect(op('+ nap(ds : Map<String, int>)').params[0].type).toBe('Map<String, int>'));
  it('static + abstract + query', () => {
    const o = op('+ $tao() : Xe {abstract, query}');
    expect(o).toMatchObject({ isStatic: true, isAbstract: true, isQuery: true });
    expect(editOperation(o)).toBe('+ $tao() : Xe {query, abstract}');
  });
  it('không có visibility → mặc định public', () => expect(op('checkIn(gateId : String)').visibility).toBe('+'));
  it('ẩn kiểu và tham số khi hiển thị gọn', () => {
    const o = op('+ dangKy(email : String, mk : String) : User');
    expect(formatOperation(o, { hideParams: true })).toBe('+ dangKy(…) : User');
    expect(formatOperation(o, { hideType: true })).toBe('+ dangKy(email, mk)');
  });
  it('parseOperation thêm () khi gõ thiếu', () =>
    expect(parseOperation('+ huy : void')).toMatchObject({ name: 'huy', returnType: 'void' }));
  it('splitTop bỏ qua dấu phẩy lồng', () =>
    expect(splitTop('a : Map<K, V>, b : (int, int)')).toEqual(['a : Map<K, V>', 'b : (int, int)']));
});
