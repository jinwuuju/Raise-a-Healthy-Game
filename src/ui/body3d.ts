import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import content from '../../data/content/body3d.v0.1.json';
import { buildModel, LAYERS, SPOT_LAYER, type Layer, type Model } from '../body3d/model';
import type { V3 } from '../body3d/sdf';
import { THREE_LICENSE, THREE_VERSION } from '../body3d/three-license';
import { button, el } from './dom';
import { openSheet } from './sheet';

/*
 * D118 Bodyscope 3D outer model viewer (design 22). The walkable organ rooms are the inside; this sheet shows the outside:
 * the heart, its great vessels and coronary arteries, the airway from the nose to the bronchial tree, the lungs with
 * their lobes, the diaphragm and the chest skeleton inside a see-through body. Drag to turn, pinch or wheel to zoom,
 * tap a marker or a structure for a note. Read-only: nothing here changes the save. three.js loads only when this
 * sheet opens (lazy chunk), like the lunch screen.
 */
export type ViewId = 'body' | 'chest' | 'heart' | 'airway';
type Spot = (typeof content.spots)[number];
const spots = content.spots as Spot[];
const spotById = new Map(spots.map(s => [s.id, s]));
const AIRWAY_SPOTS = new Set(['nose', 'conchae', 'pharynx', 'epiglottis', 'thyroid-cartilage', 'cricoid', 'trachea', 'rings', 'oesophagus', 'carina', 'right-main', 'left-main', 'bronchial-tree', 'right-lung', 'left-lung', 'fissures', 'hilum', 'lung-vessels', 'lung-apex', 'cardiac-notch', 'diaphragm', 'hyoid']);

export type Body3dHook = { ready: boolean; view: ViewId; selected: string | null; camera: THREE.PerspectiveCamera; controls: OrbitControls; select(id: string): void; markers(): { id: string; x: number; y: number; behind: boolean }[]; layers(): Layer[] };

export function openBody3d(opts: { airwayOpen: boolean; start?: ViewId; back?: () => void }): void {
  let dispose = () => {};
  openSheet(content.title, c => {
    c.parentElement!.classList.add('body3d-sheet'); c.classList.add('keep-open');
    const allowed = (id: string) => !!spotById.get(id) && (opts.airwayOpen ? id !== 'airway-locked' : !AIRWAY_SPOTS.has(id));
    const views = content.views as { id: ViewId; label: string; target: V3; camera: V3 }[];
    let view: ViewId = opts.start ?? 'body', selected: string | null = null;
    const shown = new Set<Layer>(content.viewLayers[view] as Layer[]);

    // ---------- layout
    const main = el('div', 'body3d-main'), side = el('div', 'body3d-side');
    const viewNav = el('nav', 'seg body3d-views'); viewNav.setAttribute('aria-label', '보는 범위');
    const layerNav = el('div', 'body3d-layers'); layerNav.setAttribute('role', 'group'); layerNav.setAttribute('aria-label', '보이는 층');
    const stage = el('div', 'body3d-stage'), canvas = el('canvas'), marks = el('div', 'body3d-marks'), tag = el('div', 'body3d-tag'), status = el('p', 'body3d-status');
    canvas.setAttribute('aria-label', '바디스코프 3D 외형 모형 · 끌어서 돌리고 확대해 볼 수 있어요. 구조 설명은 아래 목록에서도 고를 수 있어요.');
    canvas.tabIndex = 0;
    status.setAttribute('role', 'status'); status.textContent = content.loading;
    stage.append(canvas, marks, tag, status);
    const tools = el('div', 'body3d-tools'); tools.setAttribute('role', 'group'); tools.setAttribute('aria-label', '돌리기와 확대');
    const note = el('section', 'body3d-note'); note.setAttribute('aria-live', 'polite');
    const list = el('details', 'body3d-list-wrap'); list.open = true; const listBody = el('div', 'body3d-list'); list.append(el('summary', '', '구조 목록 · 눌러서 그 구조로 가기'), listBody);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '모형의 출처와 단순화'));
    for (const s of content.sources) { const a = el('a', '', s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', s.section + ' · 확인 ' + s.checked)); }
    content.simplification.forEach(s => refs.append(el('p', 'muted', s)));
    const oss = el('details', 'article-sources'); oss.append(el('summary', '', '오픈소스 고지 · three.js ' + THREE_VERSION), el('pre', 'body3d-license', THREE_LICENSE));
    side.append(note, list, el('p', 'muted', content.colours), el('p', 'muted', content.help), refs, oss);
    if (opts.back) side.append(button('secondary', '바디스코프 지도로 돌아가기', () => opts.back!()));
    main.append(el('div', 'body3d-left'), side);
    main.firstElementChild!.append(viewNav, layerNav, stage, tools);
    c.append(el('p', 'muted', content.disclaimer), el('p', '', content.intro), main);

    // ---------- renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch {
      status.textContent = content.noWebgl; stage.classList.add('failed');
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#150e1d');
    const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 2000);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight('#d6e8ff', '#3a1a28', 1.1));
    const key = new THREE.DirectionalLight('#fff4e8', 2.2); key.position.set(30, 40, 60); camera.add(key);
    const rimLight = new THREE.DirectionalLight('#8fd8ff', 1.0); rimLight.position.set(-60, 20, -40); camera.add(rimLight);
    const controls = new OrbitControls(camera, canvas);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.enableDamping = !reduce; controls.dampingFactor = 0.09; controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.9;
    controls.minDistance = 6; controls.maxDistance = 460; controls.screenSpacePanning = true;

    let model: Model | null = null, raf = 0, alive = true, frame = 0;
    // The height follows the window only (not the width), so a scrollbar appearing cannot make the size oscillate.
    let lastW = 0, lastH = 0;
    const size = () => {
      const w = Math.max(240, Math.round(stage.clientWidth)), h = Math.round(Math.max(240, Math.min(window.innerHeight * (window.innerWidth >= 900 ? 0.68 : 0.56), 680)));
      if (Math.abs(w - lastW) < 2 && h === lastH) return;
      lastW = w; lastH = h;
      canvas.style.height = h + 'px'; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(size)); ro.observe(stage); size();

    // ---------- camera moves
    let tween: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; t0: number } | null = null;
    const moveTo = (target: THREE.Vector3, pos: THREE.Vector3) => {
      if (reduce) { controls.target.copy(target); camera.position.copy(pos); controls.update(); return; }
      tween = { from: [controls.target.clone(), camera.position.clone()], to: [target, pos], t0: performance.now() };
    };
    const setView = (id: ViewId, instant = false) => {
      view = id; const v = views.find(x => x.id === id)!;
      shown.clear(); for (const l of content.viewLayers[id] as Layer[]) shown.add(l);
      const t = new THREE.Vector3(...v.target), p = new THREE.Vector3(...v.camera);
      if (instant) { controls.target.copy(t); camera.position.copy(p); controls.update(); } else moveTo(t, p);
      paintNav(); applyLayers(); fillList();
    };
    const focus = (id: string) => {
      const a = model?.anchors[id]; if (!a) return;
      const target = new THREE.Vector3(...a), dir = camera.position.clone().sub(controls.target).normalize();
      const dist = Math.min(camera.position.distanceTo(controls.target), view === 'body' ? 90 : view === 'heart' ? 30 : 50);
      moveTo(target, target.clone().add(dir.multiplyScalar(dist)));
    };
    const orbit = (dAz: number, dPol: number, zoom = 1) => {
      const off = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(off);
      s.theta += dAz; s.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi + dPol)); s.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, s.radius * zoom));
      camera.position.copy(controls.target.clone().add(new THREE.Vector3().setFromSpherical(s))); controls.update();
    };

    // ---------- navigation, layers, list, note
    const paintNav = () => {
      viewNav.replaceChildren(...views.map(v => {
        const locked = v.id === 'airway' && !opts.airwayOpen;
        const b = button(v.id === view ? 'on' : '', v.label, () => setView(v.id)); b.setAttribute('aria-pressed', String(v.id === view));
        if (locked) { b.disabled = true; b.title = content.locked; b.textContent = v.label + ' · 잠김'; }
        return b;
      }));
      layerNav.replaceChildren(...content.layers.map(l => {
        const on = shown.has(l.id as Layer), b = button('b3-chip', l.label, () => { if (shown.has(l.id as Layer)) shown.delete(l.id as Layer); else shown.add(l.id as Layer); applyLayers(); paintNav(); });
        b.setAttribute('aria-pressed', String(on)); return b;
      }));
    };
    const applyLayers = () => { if (model) for (const l of LAYERS) model.layers[l].visible = shown.has(l); };
    const visibleSpot = (id: string) => allowed(id) && (spotById.get(id)!.views as string[]).includes(view) && (!SPOT_LAYER[id] || shown.has(SPOT_LAYER[id]!));
    const fillList = () => {
      listBody.replaceChildren(...spots.filter(s => allowed(s.id) && (s.views as string[]).includes(view)).map(s => {
        const b = button('b3-chip' + (s.id === selected ? ' on' : ''), s.name, () => { select(s.id, true); });
        b.setAttribute('aria-pressed', String(s.id === selected)); return b;
      }));
    };
    let lit: THREE.Mesh[] = [];
    const highlight = (id: string | null) => {
      for (const m of lit) (m.material as THREE.MeshPhysicalMaterial).emissiveIntensity = (m.userData.baseGlow as number) ?? 0;
      lit = [];
      if (!model || !id) return;
      model.root.traverse(o => {
        const m = o as THREE.Mesh; if (!m.isMesh || m.userData.spot !== id) return;
        const mt = m.material as THREE.MeshPhysicalMaterial; if (m.userData.baseGlow === undefined) m.userData.baseGlow = mt.emissiveIntensity;
        mt.emissive.set('#3fd6e0'); mt.emissiveIntensity = 0.35; lit.push(m);
      });
    };
    const select = (id: string, fly = false) => {
      if (!allowed(id)) return;
      selected = id; const s = spotById.get(id)!;
      note.replaceChildren(el('h3', '', s.name), el('p', '', s.text));
      const r = el('details', 'article-sources'); r.append(el('summary', '', '근거와 확인 날짜'));
      for (const src of content.sources.filter(x => s.src.includes(x.id))) { const a = el('a', '', src.title); a.href = src.url; a.target = '_blank'; a.rel = 'noopener'; r.append(a, el('p', 'muted', src.section + ' · 확인 ' + src.checked)); }
      note.append(r, button('secondary', '설명 닫기', () => { selected = null; highlight(null); showIntro(); fillList(); }));
      highlight(id); fillList();
      if (fly) { focus(id); stage.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }
    };
    const showIntro = () => note.replaceChildren(el('h3', '', '구조 설명'), el('p', 'muted', '구조 목록에서 고르거나 모형의 구조를 직접 누르면, 모형에 그 위치가 표시되고 여기에 설명이 떠요.'));
    showIntro();

    // ---------- tools
    const step = Math.PI / 12;
    for (const [label, aria, fn] of [['◀', '왼쪽으로 돌리기', () => orbit(-step, 0)], ['▶', '오른쪽으로 돌리기', () => orbit(step, 0)], ['▲', '위에서 보기', () => orbit(0, -step)], ['▼', '아래에서 보기', () => orbit(0, step)],
      ['＋', '확대', () => orbit(0, 0, 0.8)], ['－', '축소', () => orbit(0, 0, 1.25)], ['앞', '앞에서 보기', () => frontBack(1)], ['뒤', '뒤에서 보기', () => frontBack(-1)], ['처음 시점', '이 범위의 처음 시점으로', () => setView(view)]] as [string, string, () => void][]) {
      tools.append(button('secondary', label, fn, aria));
    }
    const frontBack = (side: 1 | -1) => {
      const d = camera.position.distanceTo(controls.target), t = controls.target.clone();
      moveTo(t, t.clone().add(new THREE.Vector3(0, d * 0.12, side * d)));
    };

    // ---------- markers
    const markerEls = new Map<string, HTMLButtonElement>();
    const ray = new THREE.Raycaster();
    const opaqueVisible = (): THREE.Object3D[] => {
      const out: THREE.Object3D[] = []; if (!model) return out;
      model.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !(m.material as THREE.Material).transparent && isShown(m)) out.push(m); });
      return out;
    };
    const isShown = (o: THREE.Object3D): boolean => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const behind = new Map<string, boolean>();
    const placeMarkers = () => {
      if (!model) return;
      const w = canvas.clientWidth, h = canvas.clientHeight, checkOcclusion = frame % 8 === 0, blockers = checkOcclusion ? opaqueVisible() : [];
      for (const s of spots) {
        let m = markerEls.get(s.id);
        const a = model.anchors[s.id];
        // D118 follow-up (user, 13:33): no standing dots; only the structure chosen from the list or tapped shows where it is.
        if (!a || s.id !== selected || !visibleSpot(s.id)) { if (m) m.hidden = true; continue; }
        if (!m) {
          m = button('body3d-mark', '', () => select(s.id), s.name); m.append(el('i')); m.title = s.name;
          markerEls.set(s.id, m); marks.append(m);
        }
        const p = new THREE.Vector3(...a).project(camera);
        const x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
        if (p.z > 1 || x < 10 || y < 10 || x > w - 10 || y > h - 10) { m.hidden = true; continue; }
        m.hidden = false; m.style.left = x + 'px'; m.style.top = y + 'px';
        m.setAttribute('aria-pressed', String(s.id === selected));
        if (checkOcclusion) {
          const from = camera.position, to = new THREE.Vector3(...a), dist = from.distanceTo(to);
          ray.set(from, to.clone().sub(from).normalize()); ray.far = dist - 0.8;
          behind.set(s.id, ray.intersectObjects(blockers, false).length > 0);
        }
        m.classList.toggle('behind', !!behind.get(s.id));
      }
      // The selected structure's name as a tag, kept inside the stage.
      const sm = selected ? markerEls.get(selected) : undefined;
      if (sm && !sm.hidden) {
        tag.textContent = spotById.get(selected!)!.name; tag.hidden = false;
        const tw = tag.offsetWidth, x = Math.max(4, Math.min(w - tw - 4, parseFloat(sm.style.left) - tw / 2)), y = Math.max(4, parseFloat(sm.style.top) - 40);
        tag.style.left = x + 'px'; tag.style.top = y + 'px';
      } else tag.hidden = true;
    };

    // ---------- tapping a structure
    let down: { x: number; y: number; t: number } | null = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', e => {
      if (!down || !model) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 500; down = null;
      if (moved > 6 || !quick) return;
      const r = canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); ray.far = Infinity;
      const hits = ray.intersectObjects(model.root.children, true).filter(h => isShown(h.object) && h.object.userData.spot);
      const pick = hits.find(h => !((h.object as THREE.Mesh).material as THREE.Material).transparent) ?? hits[0];
      if (!pick) return;
      const sp = pick.object.userData.spot as string | ((p: THREE.Vector3) => string);
      const id = typeof sp === 'function' ? sp(pick.point) : sp;
      if (allowed(id)) select(id); else if (id === 'airway-locked' || AIRWAY_SPOTS.has(id)) { note.replaceChildren(el('h3', '', '호흡기'), el('p', '', spotById.get('airway-locked')!.text)); }
    });

    // ---------- loop
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / 650), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        controls.target.lerpVectors(tween.from[0], tween.to[0], e); camera.position.lerpVectors(tween.from[1], tween.to[1], e);
        if (k >= 1) tween = null;
      }
      controls.update(); renderer.render(scene, camera); frame++; placeMarkers();
    };
    paintNav(); setView(view, true);
    raf = requestAnimationFrame(loop);

    const hook: Body3dHook = {
      ready: false, get view() { return view; }, get selected() { return selected; }, camera, controls, select: id => select(id, true),
      markers: () => [...markerEls.entries()].filter(([, m]) => !m.hidden).map(([id, m]) => ({ id, x: parseFloat(m.style.left), y: parseFloat(m.style.top), behind: m.classList.contains('behind') })),
      layers: () => LAYERS.filter(l => shown.has(l)),
    } as Body3dHook;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__body3d = hook;

    void buildModel(opts.airwayOpen, (label, done, total) => { if (alive) status.textContent = content.loading + ' · ' + label + ' (' + done + '/' + total + ')'; }).then(m => {
      if (!alive) { m.dispose(); return; }
      model = m; scene.add(m.root); applyLayers(); status.hidden = true; hook.ready = true; stage.classList.add('ready');
    }).catch(e => { console.error('body3d build failed', e); status.textContent = content.noWebgl; });

    dispose = () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      model?.dispose(); renderer.dispose(); renderer.forceContextLoss();
      if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__body3d;
    };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
