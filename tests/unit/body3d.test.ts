import { describe, expect, it } from 'vitest';
import content from '../../data/content/body3d.v0.1.json';
import * as A from '../../src/body3d/anatomy';
import { signedVolume, sphere, surfaceNets, type V3 } from '../../src/body3d/sdf';
import { buildModel, LAYERS, SPOT_LAYER } from '../../src/body3d/model';
import type * as THREE from 'three';

/* D118 Bodyscope 3D outer model: the mesher, the anatomy relations the model must keep, the content contract. */
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const extent = (m: { positions: Float32Array }) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < m.positions.length; i++) { mn[i % 3] = Math.min(mn[i % 3]!, m.positions[i]!); mx[i % 3] = Math.max(mx[i % 3]!, m.positions[i]!); } return { mn, mx }; };

describe('D118 surface nets mesher', () => {
  it('makes a closed, outward-facing mesh whose volume matches the shape', () => {
    const m = surfaceNets(sphere([0, 0, 0], 5), [-6, -6, -6], [6, 6, 6], 0.5);
    const V = m.positions.length / 3, F = m.indices.length / 3;
    expect(V - (3 * F) / 2 + F).toBe(2); // Euler characteristic of a closed surface
    expect(signedVolume(m)).toBeGreaterThan(0);
    expect(Math.abs(signedVolume(m) / ((4 / 3) * Math.PI * 125) - 1)).toBeLessThan(0.03);
  });
});

describe('D118 heart outside (OpenStax 19.1)', () => {
  const heart = surfaceNets(A.heartField, A.HEART_BOX[0], A.HEART_BOX[1], 0.3);
  it('sits left of the midline with the apex pointing left, down and forward', () => {
    const d = sub(A.HEART_APEX, A.HEART_BASE);
    expect(d[0]).toBeGreaterThan(0); expect(d[1]).toBeLessThan(0); expect(d[2]).toBeGreaterThan(0);
    expect(A.chamberAt(A.HEART_APEX)).toBe('lv');
    const { mn, mx } = extent(heart);
    expect((mn[0]! + mx[0]!) / 2).toBeGreaterThan(0);
    expect(signedVolume(heart)).toBeGreaterThan(300); expect(signedVolume(heart)).toBeLessThan(1100);
  });
  it('keeps the chambers where they are: right ventricle in front, left atrium at the back, right atrium on the right', () => {
    const centre = (k: A.Chamber) => { let s: V3 = [0, 0, 0], n = 0; const P = heart.positions; for (let i = 0; i < P.length; i += 3) { const p: V3 = [P[i]!, P[i + 1]!, P[i + 2]!]; if (A.chamberAt(p) === k) { s = [s[0] + p[0], s[1] + p[1], s[2] + p[2]]; n++; } } return s.map(v => v / n) as V3; };
    const rv = centre('rv'), lv = centre('lv'), la = centre('la'), ra = centre('ra');
    expect(rv[2]).toBeGreaterThan(lv[2]); expect(la[2]).toBeLessThan(Math.min(ra[2], rv[2], lv[2]));
    expect(ra[0]).toBeLessThan(Math.min(lv[0], la[0])); expect(lv[0]).toBeGreaterThan(rv[0]);
  });
  it('runs the coronary arteries in the grooves on the surface', () => {
    const lad = A.ladPath(), rca = A.avGroove('right'), lcx = A.avGroove('left');
    expect(lad.length).toBeGreaterThan(8); expect(rca.length).toBeGreaterThan(8); expect(lcx.length).toBeGreaterThan(6);
    for (const p of [...lad, ...rca, ...lcx]) expect(Math.abs(A.heartField(...p))).toBeLessThan(0.45);
    // Along the upper part of the front, where both ventricles meet (near the apex the right ventricle ends).
    const vals = lad.map(p => Math.abs(A.CHAMBERS.lv(...p) - A.CHAMBERS.rv(...p)));
    for (const v of vals.slice(0, Math.floor(lad.length * 0.75))) expect(v).toBeLessThan(1.2);
    expect(lad[lad.length - 1]![1]).toBeLessThan(lad[0]![1] - 5); // down towards the apex
    expect(rca.slice(0, 5).every(p => p[0] < 0.5)).toBe(true); // starts round the right side
    expect(lcx.every(p => p[0] > 1)).toBe(true); // stays on the left
  });
});

describe('D118 great vessels and airway relations', () => {
  const V = Object.fromEntries(A.VESSELS.map(v => [v.id, v.pts]));
  const B = Object.fromEntries(A.BRONCHI.map(b => [b.id, b.pts]));
  it('arches the aorta over the left main bronchus and gives off three branches from the arch', () => {
    const arch = V.aorta!, top = Math.max(...arch.map(p => p[1]));
    expect(top).toBeGreaterThan(A.CARINA[1]);
    for (const p of B['l-main']!) expect(p[1]).toBeLessThan(top - 3);
    const branches = ['brachiocephalic', 'l-carotid', 'l-subclavian'].map(id => V[id]![0]!);
    for (const b of branches) expect(Math.min(...arch.map(p => len(sub(p, b))))).toBeLessThan(2.5);
    expect(branches.map(b => b[0])).toEqual([...branches.map(b => b[0])].sort((a, c) => a - c)); // right to left
  });
  it('puts the pulmonary trunk in front of the aortic root and the right pulmonary artery behind the ascending aorta', () => {
    expect(V['pulmonary-trunk']![1]![2]).toBeGreaterThan(V.aorta![1]![2]);
    const rpaMid = V.rpa!.find(p => Math.abs(p[0] - 0.6) < 0.1)!; expect(rpaMid[2]).toBeLessThan(V.aorta![2]![2]);
  });
  it('makes the right main bronchus shorter, wider and steeper than the left', () => {
    const r = B['r-main']!, l = B['l-main']!, rv = sub(r[r.length - 1]!, r[0]!), lv = sub(l[l.length - 1]!, l[0]!);
    expect(len(rv)).toBeLessThan(len(lv));
    expect(A.BRONCHI[0]!.r[0]).toBeGreaterThan(A.BRONCHI[5]!.r[0]);
    const tilt = (v: V3) => Math.atan2(Math.hypot(v[0], v[2]), -v[1]);
    expect(tilt(rv)).toBeLessThan(tilt(lv));
  });
  it('keeps the trachea in front of the oesophagus', () => {
    for (const y of [20, 15, 10]) {
      const t = A.TRACHEA_TOP[2] + (A.CARINA[2] - A.TRACHEA_TOP[2]) * (A.TRACHEA_TOP[1] - y) / (A.TRACHEA_TOP[1] - A.CARINA[1]);
      const o = A.OESOPHAGUS.reduce((a, p) => (Math.abs(p[1] - y) < Math.abs(a[1] - y) ? p : a));
      expect(t).toBeGreaterThan(o[2] + 1.5);
    }
  });
});

describe('D118 lungs, bronchi, diaphragm and ribs (OpenStax 22.2-22.3, 7.5)', () => {
  const right = surfaceNets(A.LUNG.right, A.LUNG_BOX.right[0], A.LUNG_BOX.right[1], 0.45), left = surfaceNets(A.LUNG.left, A.LUNG_BOX.left[0], A.LUNG_BOX.left[1], 0.45);
  it('makes the right lung larger, wider and shorter than the left, with three lobes against two', () => {
    expect(signedVolume(right)).toBeGreaterThan(signedVolume(left));
    const r = extent(right), l = extent(left);
    expect(r.mx[0]! - r.mn[0]!).toBeGreaterThan(l.mx[0]! - l.mn[0]!);
    expect(r.mx[1]! - r.mn[1]!).toBeLessThan(l.mx[1]! - l.mn[1]!);
    const lobes = (m: typeof right, side: 'right' | 'left') => { const n: Record<string, number> = {}; const P = m.positions; for (let i = 0; i < P.length; i += 3) { const k = A.lobeAt(side, [P[i]!, P[i + 1]!, P[i + 2]!]); n[k] = (n[k] ?? 0) + 1; } return n; };
    const rl = lobes(right, 'right'), ll = lobes(left, 'left'), rn = right.positions.length / 3;
    expect(Object.keys(rl).sort()).toEqual(['rLower', 'rMiddle', 'rUpper']); for (const v of Object.values(rl)) expect(v / rn).toBeGreaterThan(0.05);
    expect(Object.keys(ll).sort()).toEqual(['lLower', 'lUpper']);
  });
  it('leaves the cardiac notch in the left lung and keeps both lungs off the heart', () => {
    expect(A.LUNG.left(5.0, -3.6, 6.6)).toBeGreaterThan(0);
    for (const p of A.ladPath()) { expect(A.LUNG.left(...p)).toBeGreaterThan(-0.2); expect(A.LUNG.right(...p)).toBeGreaterThan(-0.2); }
  });
  it('grows the bronchial tree inside the lungs, narrowing at each split', () => {
    const tree = A.bronchialTree();
    expect(tree.length).toBeGreaterThan(300);
    for (const s of tree) { expect(Math.min(A.LUNG.right(...s.b), A.LUNG.left(...s.b))).toBeLessThan(0); expect(s.rb).toBeLessThan(s.ra); }
    expect(A.bronchialTree()).toEqual(tree); // the same on every device
  });
  it('sets the heart on the central tendon and the right dome higher than the left', () => {
    expect(A.diaphragmY(-7, 0)).toBeGreaterThan(A.diaphragmY(7, 0));
    const { mn } = extent(surfaceNets(A.heartField, A.HEART_BOX[0], A.HEART_BOX[1], 0.4));
    expect(Math.abs(mn[1]! - A.diaphragmY(3, 2))).toBeLessThan(1.6);
  });
  it('draws twelve pairs of ribs: true ribs reach the breastbone, the last two float', () => {
    const r = A.ribs();
    expect(r.length).toBe(24);
    for (const x of r) {
      if (x.k >= 11) expect(x.cartilage).toEqual([]);
      if (x.k <= 7) expect(Math.abs(x.cartilage[x.cartilage.length - 1]![0])).toBeLessThan(2.6);
      expect(x.bone[x.bone.length - 1]![1]).toBeLessThan(x.bone[0]![1]); // ribs slope down towards the front
    }
    expect(A.VERTEBRAE.map(v => v.region).join(',')).toBe([...Array(7).fill('cervical'), ...Array(12).fill('thoracic'), ...Array(5).fill('lumbar')].join(','));
  });
});

describe('D118 content and model contract', () => {
  it('keeps the content a labelled draft with sources, no numbers, no diseases, and an anchor for every note', () => {
    expect(content.status).toBe('draft_unreviewed'); expect(content.review).toBeNull(); expect(content.disclaimer).toContain('검수 전 모형');
    const ids = new Set(content.sources.map(s => s.id)), anchors = A.anchors();
    const spotIds = content.spots.map(s => s.id); expect(new Set(spotIds).size).toBe(spotIds.length);
    for (const s of content.spots) {
      expect(s.src.length).toBeGreaterThan(0); for (const x of s.src) expect(ids.has(x)).toBe(true);
      expect(anchors[s.id], s.id).toBeDefined(); expect(anchors[s.id]!.every(Number.isFinite)).toBe(true);
      expect(SPOT_LAYER[s.id] ?? 'none', s.id).not.toBe('none');
      for (const v of s.views) expect(['body', 'chest', 'heart', 'airway']).toContain(v);
    }
    const screen = [content.title, content.disclaimer, content.intro, content.help, content.colours, content.locked, content.noWebgl, ...content.spots.map(s => s.name + s.text), ...content.layers.map(l => l.label), ...content.views.map(v => v.label), ...content.simplification].join('');
    expect(/[0-9]/.test(screen.replaceAll('3D', ''))).toBe(false); // the only digit allowed is the name of the view itself
    for (const w of ['협심증', '심근경색', '심부전', '폐렴', '천식', '폐암', '결핵', '코로나', '진단하세요']) expect(screen).not.toContain(w);
    expect(content.layers.map(l => l.id).sort()).toEqual([...LAYERS].sort());
  });
  it('builds every layer in node without a GPU, and tags meshes with notes that exist', async () => {
    const steps: string[] = [];
    const m = await buildModel(true, label => steps.push(label));
    expect(steps[steps.length - 1]).toBe('완료');
    const spots = new Set(content.spots.map(s => s.id)), seen = new Set<string>();
    for (const l of LAYERS) expect(m.layers[l].children.length, l).toBeGreaterThan(0);
    m.root.traverse(o => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      expect(mesh.geometry.attributes.position!.count, mesh.name).toBeGreaterThan(0);
      const s = mesh.userData.spot; if (typeof s === 'string') { expect(spots.has(s), mesh.name + ' ' + s).toBe(true); seen.add(s); }
    });
    for (const id of ['aorta', 'pulmonary-trunk', 'lad', 'rca', 'lcx', 'trachea', 'rings', 'bronchial-tree', 'diaphragm', 'ribs', 'spine']) expect(seen.has(id), id).toBe(true);
    // C-shaped rings open at the back: no ring vertex lies behind the trachea's back wall.
    const rings = m.layers.airway.children.find(c => c.name === 'rings') as THREE.Mesh, P = rings.geometry.attributes.position!;
    let back = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i), axisZ = A.TRACHEA_TOP[2] + (A.CARINA[2] - A.TRACHEA_TOP[2]) * (A.TRACHEA_TOP[1] - y) / (A.TRACHEA_TOP[1] - A.CARINA[1]); if (P.getZ(i) < axisZ - 1.05) back++; }
    expect(back).toBe(0);
    m.dispose();
    const locked = await buildModel(false, () => {});
    locked.root.traverse(o => { const s = (o as THREE.Mesh).userData?.spot; if (typeof s === 'string' && ['trachea', 'right-lung', 'diaphragm'].includes(s)) throw new Error('airway note before the airway opens'); });
    locked.dispose();
  }, 60000);
});
