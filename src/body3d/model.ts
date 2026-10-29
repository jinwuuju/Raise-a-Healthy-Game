import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BODY, BODY_BOX, BRONCHI, CARINA, CHAMBER_COLOUR, CLAVICLE, CONCHAE, CRICOID, DIAPHRAGM_EDGE, EPIGLOTTIS, HEART_BOX, HYOID, LARYNX_LUMEN, LUNG, LUNG_BOX,
  NASAL, OESOPHAGUS, PHARYNX, RINGS, STERNUM, THYROID_LAMINA, TRACHEA_R, TRACHEA_TOP, VERTEBRAE, VESSELS, VESSEL_COLOUR, anchors, avGroove, bronchialTree,
  chamberAt, diaphragmY, heartField, ladPath, lobeAt, lungColour, ribs, spineAt, type Lobe,
} from './anatomy';
import { surfaceNets, sub, norm, cross, project, type MeshData, type V3 } from './sdf';

/*
 * D118 Bodyscope 3D outer model: turns the anatomy numbers into three.js meshes. Each mesh belongs to a layer the viewer
 * can show or hide, and carries the hotspot it explains (userData.spot), so tapping the surface opens the same note as
 * the marker. Nothing here touches the game state.
 */
export type Layer = 'skin' | 'bones' | 'heart' | 'lungs' | 'airway' | 'diaphragm';
export const LAYERS: Layer[] = ['skin', 'bones', 'heart', 'lungs', 'airway', 'diaphragm'];
/** The layer each hotspot belongs to: its marker hides with the layer. */
export const SPOT_LAYER: Record<string, Layer> = Object.fromEntries([
  ...['heart', 'ra', 'rv', 'la', 'lv', 'apex', 'auricle', 'aorta', 'arch-branches', 'pulmonary-trunk', 'svc', 'ivc', 'pulmonary-veins', 'rca', 'lad', 'lcx'].map(id => [id, 'heart']),
  ...['nose', 'conchae', 'pharynx', 'epiglottis', 'thyroid-cartilage', 'cricoid', 'trachea', 'rings', 'oesophagus', 'carina', 'right-main', 'left-main', 'bronchial-tree'].map(id => [id, 'airway']),
  ...['right-lung', 'left-lung', 'fissures', 'hilum', 'lung-apex', 'cardiac-notch', 'lung-vessels', 'airway-locked'].map(id => [id, 'lungs']),
  ['diaphragm', 'diaphragm'], ...['ribs', 'sternum', 'spine', 'hyoid'].map(id => [id, 'bones']),
]) as Record<string, Layer>;
export type Model = { root: THREE.Group; layers: Record<Layer, THREE.Group>; anchors: Record<string, V3>; dispose: () => void };

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
/** Merges geometries after giving them the same attributes (position and normal only, no index). */
function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const same = list.map(g => {
    const x = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(x.attributes)) if (name !== 'position' && name !== 'normal') x.deleteAttribute(name);
    if (!x.attributes.normal) x.computeVertexNormals();
    return x;
  });
  const out = mergeGeometries(same);
  if (!out) throw new Error('mesh merge failed');
  return out;
}

function fromNets(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
  if (m.colors) g.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

/** A smooth tube through points whose radius narrows from r0 to r1, with rounded caps. */
function tube(pts: V3[], r0: number, r1: number, radial = 14): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map(v3), false, 'centripetal');
  const segs = Math.max(8, Math.round(curve.getLength() * 1.6));
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute, nor = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i <= segs; i++) {
    const r = r0 + (r1 - r0) * (i / segs), c = curve.getPointAt(i / segs);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j, n = new THREE.Vector3(nor.getX(k), nor.getY(k), nor.getZ(k));
      pos.setXYZ(k, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
    }
  }
  const caps = [new THREE.SphereGeometry(r0, radial, 8), new THREE.SphereGeometry(r1, radial, 8)];
  caps[0]!.translate(pts[0]![0], pts[0]![1], pts[0]![2]); caps[1]!.translate(pts[pts.length - 1]![0], pts[pts.length - 1]![1], pts[pts.length - 1]![2]);
  // Keep the tube's own radial normals (recomputing on a non-indexed mesh would make it look faceted).
  return merge([g, caps[0]!, caps[1]!]);
}

/** A tapered cylinder between two points (for many small bronchi, merged into one mesh). */
function strut(a: V3, b: V3, ra: number, rb: number, radial: number): THREE.BufferGeometry {
  const A = v3(a), B = v3(b), h = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(rb, ra, h, radial, 1, true);
  g.translate(0, h / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  g.translate(A.x, A.y, A.z);
  return g.toNonIndexed();
}

/** A flat plate of some thickness from a roughly planar convex outline (cartilages, the breastbone, the epiglottis). */
function plate(outline: V3[], thick: number): THREE.BufferGeometry {
  const n = norm(cross(sub(outline[1]!, outline[0]!), sub(outline[2]!, outline[0]!)));
  const off = (p: V3, k: number): number[] => [p[0] + n[0] * k, p[1] + n[1] * k, p[2] + n[2] * k];
  const top = outline.map(p => off(p, thick / 2)), bottom = outline.map(p => off(p, -thick / 2)), pos: number[] = [];
  for (let i = 1; i < outline.length - 1; i++) { pos.push(...top[0]!, ...top[i]!, ...top[i + 1]!, ...bottom[0]!, ...bottom[i + 1]!, ...bottom[i]!); }
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    pos.push(...top[i]!, ...bottom[i]!, ...bottom[j]!, ...top[i]!, ...bottom[j]!, ...top[j]!);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

type MatOpts = { color?: string | number; opacity?: number; vertexColors?: boolean; rough?: number; clearcoat?: number; side?: THREE.Side; emissive?: string };
function mat(o: MatOpts): THREE.MeshPhysicalMaterial {
  const transparent = (o.opacity ?? 1) < 1;
  return new THREE.MeshPhysicalMaterial({
    color: o.color ?? '#ffffff', vertexColors: !!o.vertexColors, roughness: o.rough ?? 0.55, metalness: 0, clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.5,
    transparent, opacity: o.opacity ?? 1, depthWrite: !transparent, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissive ? 0.25 : 0,
  });
}
function mesh(g: THREE.BufferGeometry, m: THREE.Material, spot: string | ((p: THREE.Vector3) => string) | null, name: string): THREE.Mesh {
  const x = new THREE.Mesh(g, m); x.name = name; x.userData.spot = spot;
  if ((m as THREE.MeshPhysicalMaterial).transparent) x.renderOrder = 2;
  return x;
}

const LOBE_SPOT: Record<Lobe, string> = { rUpper: 'right-lung', rMiddle: 'right-lung', rLower: 'right-lung', lUpper: 'left-lung', lLower: 'left-lung' };
const CHAMBER_SPOT: Record<string, string> = { lv: 'lv', rv: 'rv', ra: 'ra', la: 'la', rau: 'auricle', lau: 'auricle' };

/**
 * Builds the whole model in steps (the browser stays responsive and shows progress). `airwayOpen` false draws the
 * airway, lungs and diaphragm in a neutral grey with no notes (the chapter opens with the heart graduation).
 */
export async function buildModel(airwayOpen: boolean, progress: (label: string, done: number, total: number) => void): Promise<Model> {
  const root = new THREE.Group(), layers = Object.fromEntries(LAYERS.map(l => { const g = new THREE.Group(); g.name = l; root.add(g); return [l, g]; })) as Record<Layer, THREE.Group>;
  const owned: { dispose(): void }[] = [];
  const add = (layer: Layer, m: THREE.Mesh) => { layers[layer].add(m); owned.push(m.geometry, m.material as THREE.Material); };
  const steps: [string, () => void][] = [];
  const grey = (c: string) => (airwayOpen ? c : '#8f8a98');
  const airSpot = (s: string) => (airwayOpen ? s : 'airway-locked');

  steps.push(['심장의 겉모양', () => {
    const g = fromNets(surfaceNets(heartField, HEART_BOX[0], HEART_BOX[1], 0.22, p => CHAMBER_COLOUR[chamberAt(p)]));
    add('heart', mesh(g, mat({ vertexColors: true, rough: 0.42, clearcoat: 0.35 }), p => CHAMBER_SPOT[chamberAt([p.x, p.y, p.z])]!, 'heart'));
  }]);
  steps.push(['큰 혈관과 관상동맥', () => {
    for (const v of VESSELS) add('heart', mesh(tube(v.pts, v.r[0], v.r[1]), mat({ color: VESSEL_COLOUR[v.kind], rough: 0.4, clearcoat: 0.3 }), v.spot, v.id));
    const coronary = mat({ color: '#ff5a5f', rough: 0.35, clearcoat: 0.4, emissive: '#5a0c10' });
    // Lift each groove path just above the surface so the artery sits in the groove, not inside the muscle.
    const lift = (pts: V3[]) => pts.map(p => project(heartField, p, 0.22));
    add('heart', mesh(tube(lift(ladPath()), 0.3, 0.2, 8), coronary, 'lad', 'lad'));
    add('heart', mesh(tube(lift(avGroove('right')), 0.32, 0.22, 8), coronary.clone(), 'rca', 'rca'));
    add('heart', mesh(tube(lift(avGroove('left')), 0.28, 0.2, 8), coronary.clone(), 'lcx', 'lcx'));
    // Fat in the grooves (pale yellow) under the arteries, and the great cardiac vein beside the anterior artery.
    const fat = mat({ color: '#e9cf8a', rough: 0.7 }), groovePaths = [ladPath(), avGroove('right'), avGroove('left')];
    add('heart', mesh(merge(groovePaths.map(g => tube(g.map(p => project(heartField, p, 0.02)), 0.55, 0.4, 10))), fat, null, 'groove-fat'));
    const vein = ladPath().map(p => project(heartField, [p[0] - 0.7, p[1] - 0.1, p[2] + 0.1], 0.18));
    add('heart', mesh(tube(vein, 0.2, 0.14, 8), mat({ color: '#3a5cc4', rough: 0.4, clearcoat: 0.3 }), null, 'great-cardiac-vein'));
  }]);
  steps.push(['오른폐', () => {
    const g = fromNets(surfaceNets(LUNG.right, LUNG_BOX.right[0], LUNG_BOX.right[1], 0.36, p => (airwayOpen ? lungColour('right', p) : [0.55, 0.53, 0.6])));
    add('lungs', mesh(g, mat({ vertexColors: true, opacity: 0.38, rough: 0.75 }), p => airSpot(LOBE_SPOT[lobeAt('right', [p.x, p.y, p.z])]), 'right-lung'));
  }]);
  steps.push(['왼폐', () => {
    const g = fromNets(surfaceNets(LUNG.left, LUNG_BOX.left[0], LUNG_BOX.left[1], 0.36, p => (airwayOpen ? lungColour('left', p) : [0.55, 0.53, 0.6])));
    add('lungs', mesh(g, mat({ vertexColors: true, opacity: 0.38, rough: 0.75 }), p => airSpot(LOBE_SPOT[lobeAt('left', [p.x, p.y, p.z])]), 'left-lung'));
  }]);
  steps.push(['폐 속 혈관 가지', () => {
    // Pulmonary arteries branch along the bronchi; pulmonary veins gather blood back towards the hilum (OpenStax 22.2).
    const art: THREE.BufferGeometry[] = [], ven: THREE.BufferGeometry[] = [];
    for (const s of bronchialTree()) {
      if (s.ra < 0.16) continue;
      const d = norm(sub(s.b, s.a)), side = norm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), k = s.ra + 0.22;
      const off = (p: V3, m: number): V3 => [p[0] + side[0] * k * m, p[1] + side[1] * k * m, p[2] + side[2] * k * m];
      art.push(strut(off(s.a, 1), off(s.b, 1), s.ra * 0.8, s.rb * 0.8, 6));
      ven.push(strut(off(s.a, -1.1), off(s.b, -1.1), s.ra * 0.72, s.rb * 0.72, 6));
    }
    add('lungs', mesh(merge(art), mat({ color: grey(VESSEL_COLOUR.pulmonaryArtery), rough: 0.5, opacity: 0.85 }), airSpot('lung-vessels'), 'lung-arteries'));
    add('lungs', mesh(merge(ven), mat({ color: grey(VESSEL_COLOUR.pulmonaryVein), rough: 0.5, opacity: 0.85 }), airSpot('lung-vessels'), 'lung-veins'));
  }]);
  steps.push(['기관과 기관지', () => {
    const lining = mat({ color: grey('#e8b4b4'), opacity: 0.55, rough: 0.5 }), cart = mat({ color: grey('#eef0e4'), rough: 0.45, clearcoat: 0.2 });
    add('airway', mesh(tube([TRACHEA_TOP, CARINA], TRACHEA_R * 0.94, TRACHEA_R * 0.94, 20), lining, airSpot('trachea'), 'trachea'));
    // C-shaped rings, open at the back (towards the oesophagus).
    const ringGeo: THREE.BufferGeometry[] = [];
    const axis = v3(CARINA).sub(v3(TRACHEA_TOP)).normalize();
    for (const c of RINGS) {
      const t = new THREE.TorusGeometry(TRACHEA_R * 1.02, 0.2, 6, 28, Math.PI * 1.55);
      // Torus arc starts at +x and turns towards +y; rotate so the gap faces the back, then lie it across the trachea.
      t.rotateZ(-Math.PI * 0.275); t.rotateX(Math.PI / 2);
      t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis));
      t.translate(c[0], c[1], c[2]); ringGeo.push(t);
    }
    add('airway', mesh(merge(ringGeo), cart, airSpot('rings'), 'rings'));
    for (const b of BRONCHI) add('airway', mesh(tube(b.pts, b.r[0], b.r[1], 14), cart.clone(), airSpot(b.spot), b.id));
    const tree = bronchialTree().map(s => strut(s.a, s.b, s.ra, s.rb, s.ra > 0.25 ? 8 : 5));
    add('airway', mesh(merge(tree), mat({ color: grey('#efdccc'), rough: 0.6 }), airSpot('bronchial-tree'), 'bronchial-tree'));
  }]);
  steps.push(['후두·인두·식도·코안', () => {
    const cart = mat({ color: grey('#d9e4ea'), rough: 0.4, clearcoat: 0.25, side: THREE.DoubleSide });
    for (const s of [1, -1] as const) add('airway', mesh(plate(THYROID_LAMINA(s), 0.28), cart.clone(), airSpot('thyroid-cartilage'), 'thyroid-' + s));
    const ring = new THREE.TorusGeometry(CRICOID.r, 0.3, 8, 28); ring.rotateX(Math.PI / 2); ring.translate(0, CRICOID.y, -1.7);
    add('airway', mesh(merge([ring, plate(CRICOID.back, 0.5)]), cart.clone(), airSpot('cricoid'), 'cricoid'));
    add('airway', mesh(plate(EPIGLOTTIS, 0.2), mat({ color: grey('#f0dfa6'), rough: 0.45, side: THREE.DoubleSide }), airSpot('epiglottis'), 'epiglottis'));
    add('airway', mesh(tube(LARYNX_LUMEN, 1.05, 0.95, 16), mat({ color: grey('#e9a9ae'), opacity: 0.45 }), airSpot('thyroid-cartilage'), 'larynx'));
    add('bones', mesh(tube(HYOID, 0.3, 0.3, 8), mat({ color: '#efe4cc', rough: 0.6 }), 'hyoid', 'hyoid'));
    add('airway', mesh(tube(PHARYNX, 1.6, 1.15, 18), mat({ color: grey('#e58f96'), opacity: 0.42 }), airSpot('pharynx'), 'pharynx'));
    add('airway', mesh(tube(OESOPHAGUS, 0.9, 0.9, 14), mat({ color: grey('#d49b7c'), rough: 0.6 }), airSpot('oesophagus'), 'oesophagus'));
    add('airway', mesh(fromNets(surfaceNets(NASAL, [-2.4, 33.4, -0.4], [2.4, 40.6, 10.6], 0.18)), mat({ color: grey('#f0a3a8'), opacity: 0.32 }), airSpot('nose'), 'nasal-cavity'));
    const shelves: THREE.BufferGeometry[] = [];
    for (const c of CONCHAE) for (const s of [1, -1]) { const e = new THREE.SphereGeometry(1, 18, 10); e.scale(c.r[0], c.r[1], c.r[2]); e.translate(s * c.c[0], c.c[1], c.c[2]); shelves.push(e); }
    add('airway', mesh(merge(shelves), mat({ color: grey('#e27f88'), rough: 0.5 }), airSpot('conchae'), 'conchae'));
  }]);
  steps.push(['횡격막', () => {
    // A dome sheet over an ellipse: muscle at the rim, the central tendon (pale) in the middle.
    const R = 34, A = 64, pos: number[] = [], col: number[] = [], idx: number[] = [];
    for (let i = 0; i <= R; i++) for (let j = 0; j < A; j++) {
      const r = i / R, a = (j / A) * Math.PI * 2, x = Math.cos(a) * r * DIAPHRAGM_EDGE.x, z = Math.sin(a) * r * (Math.sin(a) > 0 ? DIAPHRAGM_EDGE.zFront : DIAPHRAGM_EDGE.zBack);
      const rimDrop = Math.max(0, r - 0.7) / 0.3, y = diaphragmY(x, z) - rimDrop * rimDrop * (Math.sin(a) > 0 ? 2.0 : 5.5);
      pos.push(x, y, z);
      const tendon = Math.hypot((x - 1) / 8, (z - 1) / 5.5) < 1 ? 1 : 0, c = airwayOpen ? (tendon ? [0.9, 0.84, 0.76] : [0.68, 0.24, 0.28]) : [0.58, 0.56, 0.62];
      col.push(...c);
      if (i < R) { const n = j + 1 === A ? 0 : j + 1; idx.push(i * A + j, (i + 1) * A + j, (i + 1) * A + n, i * A + j, (i + 1) * A + n, i * A + n); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    add('diaphragm', mesh(g, mat({ vertexColors: true, opacity: 0.8, rough: 0.6, side: THREE.DoubleSide }), airSpot('diaphragm'), 'diaphragm'));
  }]);
  steps.push(['갈비뼈·가슴뼈·척추', () => {
    const bone = mat({ color: '#efe6d2', rough: 0.55, opacity: 0.62 }), cartilage = mat({ color: '#c9dde3', rough: 0.4, opacity: 0.55 });
    const ribGeo: THREE.BufferGeometry[] = [], cartGeo: THREE.BufferGeometry[] = [];
    for (const r of ribs()) {
      ribGeo.push(tube(r.bone, 0.5, 0.42, 8));
      if (r.cartilage.length) cartGeo.push(tube(r.cartilage, 0.4, 0.36, 8));
    }
    add('bones', mesh(merge(ribGeo), bone, 'ribs', 'ribs'));
    add('bones', mesh(merge(cartGeo), cartilage, 'ribs', 'costal-cartilage'));
    add('bones', mesh(plate(STERNUM, 1.1), bone.clone(), 'sternum', 'sternum'));
    for (const s of [1, -1] as const) add('bones', mesh(tube(CLAVICLE(s), 0.6, 0.55, 10), bone.clone(), 'ribs', 'clavicle'));
    const verts: THREE.BufferGeometry[] = [];
    for (const v of VERTEBRAE) {
      const c = spineAt(v.y), body = new THREE.CylinderGeometry(v.r, v.r, v.h, 16); body.translate(c[0], c[1], c[2]); verts.push(body.toNonIndexed());
      const arch = new THREE.TorusGeometry(v.r * 0.7, v.r * 0.22, 6, 14, Math.PI); arch.rotateX(Math.PI / 2); arch.rotateY(Math.PI); arch.translate(c[0], c[1], c[2] - v.r * 0.95); verts.push(arch.toNonIndexed());
      const spine = new THREE.CylinderGeometry(v.r * 0.18, v.r * 0.3, v.r * 1.8, 6); spine.rotateX(-Math.PI / 2 - 0.5); spine.translate(c[0], c[1] - v.r * 0.4, c[2] - v.r * 2.2); verts.push(spine.toNonIndexed());
      for (const s of [1, -1]) { const tp = new THREE.CylinderGeometry(v.r * 0.16, v.r * 0.22, v.r * 1.4, 6); tp.rotateZ(Math.PI / 2); tp.translate(c[0] + s * v.r * 1.15, c[1], c[2] - v.r * 1.0); verts.push(tp.toNonIndexed()); }
    }
    add('bones', mesh(merge(verts), bone.clone(), 'spine', 'spine'));
  }]);
  steps.push(['몸의 윤곽', () => {
    const g = fromNets(surfaceNets(BODY, BODY_BOX[0], BODY_BOX[1], 1.2));
    const skin = mesh(g, mat({ color: '#f2c6a8', opacity: 0.24, rough: 0.8, emissive: '#3a2030' }), null, 'skin');
    skin.renderOrder = 4; add('skin', skin);
  }]);

  for (let i = 0; i < steps.length; i++) {
    progress(steps[i]![0], i, steps.length);
    await new Promise(r => setTimeout(r, 0));
    steps[i]![1]();
  }
  progress('완료', steps.length, steps.length);
  return { root, layers, anchors: anchors(), dispose: () => { for (const o of owned) o.dispose(); } };
}
