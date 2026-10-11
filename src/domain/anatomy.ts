import raw from '../../data/content/heart-anatomy.v0.1.json';
import { isModelRoom } from '../world/types';

/** Source-backed anatomical relationships are distinct from the game's exploration corridors. */
export function validateAnatomy(a: typeof raw): typeof raw {
  if (a.status !== 'draft_unreviewed' || a.review !== null || !a.disclaimer.includes('검수 전 모형') || !a.view || !a.limitations) throw new Error('해부 도감의 검수 경계 누락');
  const sources = new Set(a.sources.map(s => s.id));
  const ids = new Set(a.landmarks.map(n => n.id));
  if (sources.size !== a.sources.length || ids.size !== a.landmarks.length) throw new Error('해부 도감 ID 중복');
  for (const s of a.sources) if (!s.url.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt)) throw new Error('해부 출처 오류');
  for (const n of a.landmarks) if (!n.title || !n.text || !n.sources.length || n.sources.some(s => !sources.has(s)) || !Number.isInteger(n.x) || !Number.isInteger(n.y) || n.x < 0 || n.x > 280 || n.y < 0 || n.y > 224) throw new Error('해부 구조 참조 오류');
  for (const n of a.externalNodes) { if (ids.has(n.id)) throw new Error('해부 외부 노드 중복'); ids.add(n.id); }
  for (const edges of [a.bloodEdges, a.signalEdges]) if (edges.some(e => e.length !== 2 || e.some(id => !ids.has(id)))) throw new Error('해부 연결 참조 오류');
  const blood = new Set(a.bloodEdges.map(e => e.join('>')));
  for (const edge of ['svc>ra','ivc>ra','ra>tricuspid','tricuspid>rv','rv>pulmonary-valve','pulmonary-valve>pulmonary-artery','pulmonary-artery>lung','lung>pulmonary-veins','pulmonary-veins>la','la>mitral','mitral>lv','lv>aortic-valve','aortic-valve>aorta','aorta>coronary','coronary>myocardium','coronary-veins>ra']) if (!blood.has(edge)) throw new Error('필수 해부 연결 누락: '+edge);
  if (blood.has('ra>la') || blood.has('rv>lv') || blood.has('sa>av')) throw new Error('혈액·중격·전기 신호의 연결 혼동');
  const signal = new Set(a.signalEdges.map(e => e.join('>')));
  for (const edge of ['sa>atria','atria>av','av>his','his>bundle-branches','bundle-branches>purkinje','purkinje>ventricles']) if (!signal.has(edge)) throw new Error('전도계 연결 누락');
  const conduction = new Set(a.landmarks.filter(n => n.kind === 'conduction').map(n => n.id));
  if (a.bloodEdges.some(e => e.some(id => conduction.has(id))) || a.signalEdges.some(e => e.some(id => !conduction.has(id) && !['atria','ventricles'].includes(id)))) throw new Error('혈액과 전기 신호 그래프 혼동');
  const byId = new Map(a.landmarks.map(n => [n.id,n]));
  if (byId.get('ra')!.x >= byId.get('la')!.x || byId.get('rv')!.x >= byId.get('lv')!.x || byId.get('sa')!.x >= byId.get('la')!.x) throw new Error('정면 개념도 좌우 방향 오류');
  const districts = new Map(a.districts.map(d => [d.room,d]));
  if (districts.size !== 7 || a.districts.some(d => !isModelRoom(d.room as Parameters<typeof isModelRoom>[0]) || d.neighbors.some(n => !districts.get(n)?.neighbors.includes(d.room)))) throw new Error('탐험 구역 연결 오류');
  const reachable = new Set<string>();
  const visit = (id: string) => { if (reachable.has(id)) return; reachable.add(id); districts.get(id)?.neighbors.forEach(visit); };
  visit('heart'); if (reachable.size !== 7) throw new Error('끊긴 심장 탐험 구역');
  return a;
}
export const heartAnatomy = validateAnatomy(raw);
