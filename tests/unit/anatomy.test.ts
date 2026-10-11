import { describe, expect, it } from 'vitest';
import { heartAnatomy, validateAnatomy } from '../../src/domain/anatomy';

describe('source-backed heart anatomy', () => {
  it('keeps major valve/vessel and coronary pathways separate from conduction and exploration', () => {
    expect(validateAnatomy(heartAnatomy)).toBe(heartAnatomy);
    expect(heartAnatomy.landmarks).toHaveLength(20);
    expect(heartAnatomy.signalEdges.flat()).toContain('purkinje');
    expect(heartAnatomy.districts).toHaveLength(7);
  });
  for (const [name, edit] of [
    ['wrong valve path', (a:typeof heartAnatomy) => { a.bloodEdges = a.bloodEdges.filter(e => e.join('>') !== 'la>mitral'); }],
    ['direct septal opening', (a:typeof heartAnatomy) => { a.bloodEdges.push(['ra','la']); }],
    ['signal as blood flow', (a:typeof heartAnatomy) => { a.bloodEdges.push(['sa','av']); }],
    ['mirrored anatomical right', (a:typeof heartAnatomy) => { a.landmarks.find(n => n.id==='ra')!.x = 240; }],
    ['missing source', (a:typeof heartAnatomy) => { a.sources = []; }],
    ['broken district connection', (a:typeof heartAnatomy) => { a.districts[0]!.neighbors = []; }],
    ['false reviewed state', (a:typeof heartAnatomy) => { a.status = 'approved'; }],
  ] as const) it('rejects '+name, () => { const a = structuredClone(heartAnatomy); edit(a); expect(() => validateAnatomy(a)).toThrow(); });
});
