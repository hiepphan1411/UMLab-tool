import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, UMLAB_FORMAT } from '../src';

describe('core', () => {
  it('exports format constants', () => {
    expect(UMLAB_FORMAT).toBe('umlab');
    expect(SCHEMA_VERSION).toBe(1);
  });
});
