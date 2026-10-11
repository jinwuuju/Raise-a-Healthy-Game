import content from '../../data/content/q004.v0.1.json';
export const q4Text = content;
export const q4Evidence = ['pulmonary-out','gas','pulmonary-return','systemic-out','body-route','systemic-return'] as const;
export type Q4Evidence = typeof q4Evidence[number];
export type RouteId = 'pulmonary' | 'systemic';
export type Q4State = { accepted: boolean; notes: Q4Evidence[]; crossedBody: boolean; routes: Record<RouteId, boolean>; joined: boolean; lead: RouteId | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ4 = (): Q4State => ({ accepted:false, notes:[], crossedBody:false, routes:{pulmonary:false,systemic:false}, joined:false, lead:null, limit:null, checked:false, publishedAt:null });
export function validateQ4(value: unknown): Q4State {
  if(value===undefined) return emptyQ4();
  const fail=():never=>{throw new Error('Q004 순환 취재 기록이 잘못되었습니다.');};
  if(!value || typeof value!=='object' || Array.isArray(value))return fail();
  const q=value as Q4State;
  if(typeof q.accepted!=='boolean' || !Array.isArray(q.notes) || q.notes.length>6 || !q.notes.every(n=>q4Evidence.includes(n)) || new Set(q.notes).size!==q.notes.length || typeof q.crossedBody!=='boolean' || !q.routes || typeof q.routes.pulmonary!=='boolean' || typeof q.routes.systemic!=='boolean' || typeof q.joined!=='boolean' || typeof q.checked!=='boolean' ||
    !(q.lead===null || content.article.leads.some(l=>l.id===q.lead)) || !(q.limit===null || content.article.limitations.some(l=>l.id===q.limit)) || !(q.publishedAt===null || (typeof q.publishedAt==='string'&&Number.isFinite(Date.parse(q.publishedAt)))))return fail();
  for(let i=0;i<q.notes.length;i++)if(!Object.hasOwn(q.notes,i)||!q4Evidence.includes(q.notes[i]!))return fail();
  const has=(id:string)=>q.notes.includes(id as Q4Evidence), all=q4Evidence.every(has), both=q.routes.pulmonary&&q.routes.systemic;
  if((!q.accepted&&(q.notes.length||q.crossedBody||q.routes.pulmonary||q.routes.systemic||q.joined||q.lead||q.limit||q.checked||q.publishedAt)) ||
     (q.crossedBody&&!q4Evidence.slice(0,5).every(has)) || (has('systemic-return')&&!q.crossedBody) ||
     ((q.routes.pulmonary||q.routes.systemic||q.lead||q.limit)&&!all) || (q.joined&&!both) || ((q.checked||q.publishedAt)&&(!q.joined||!q.lead||!q.limit)) || (q.publishedAt&&!q.checked))return fail();
  return { accepted:q.accepted, notes:[...q.notes], crossedBody:q.crossedBody, routes:{pulmonary:q.routes.pulmonary,systemic:q.routes.systemic}, joined:q.joined, lead:q.lead, limit:q.limit, checked:q.checked, publishedAt:q.publishedAt };
}
