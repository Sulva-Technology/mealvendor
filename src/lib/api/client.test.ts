import { describe, expect, it } from 'vitest';
import { unwrapEnvelope } from './client';

describe('unwrapEnvelope', () => {
  it('returns the payload inside the success envelope', () => {
    expect(unwrapEnvelope({ data: [{ id: 'a' }] })).toEqual([{ id: 'a' }]);
    expect(unwrapEnvelope({ data: { id: 'a' }, meta: {} })).toEqual({ id: 'a' });
  });

  it('keeps a null payload null instead of returning the envelope', () => {
    expect(unwrapEnvelope({ data: null })).toBeNull();
  });

  it('passes through bodies that are not envelopes', () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope({ id: 'a' })).toEqual({ id: 'a' });
    expect(unwrapEnvelope([1, 2])).toEqual([1, 2]);
  });
});
