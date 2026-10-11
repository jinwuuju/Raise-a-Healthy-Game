import content from '../../data/content/q001-article.v0.1.json';
import heart from '../../data/content/heart-interior.v0.1.json';

export const articleText = content;
export type ArticleSlot = 'lead' | 'returning' | 'outgoing' | 'extra';
export type Q1Article = {
  lead: string | null; returning: string | null; outgoing: string | null; extra: string | null;
  checked: boolean; publishedAt: string | null;
};
export const emptyArticle = (): Q1Article => ({ lead: null, returning: null, outgoing: null, extra: null, checked: false, publishedAt: null });

/** Absent article fields in earlier schema-4 saves become an empty draft. Invalid new fields fail closed. */
export function validateArticle(value: unknown): Q1Article {
  if (value === undefined) return emptyArticle();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('기사 기록이 잘못되었습니다.');
  const a = value as Record<string, unknown>;
  const valid = (v: unknown, ids: string[]) => v === null || (typeof v === 'string' && ids.includes(v));
  if (!valid(a.lead, content.leads.map(l => l.id)) || !valid(a.returning, content.evidence.map(e => e.id)) ||
      !valid(a.outgoing, content.evidence.map(e => e.id)) || !valid(a.extra, Object.keys(heart.discoveries)) ||
      typeof a.checked !== 'boolean' || !(a.publishedAt === null || (typeof a.publishedAt === 'string' && Number.isFinite(Date.parse(a.publishedAt))))) {
    throw new Error('기사 기록이 잘못되었습니다.');
  }
  if ((a.checked || a.publishedAt !== null) && (!a.lead || a.returning !== 'heart-in' || a.outgoing !== 'heart-out')) throw new Error('편집 확인된 기사의 근거가 잘못되었습니다.');
  if (a.publishedAt !== null && !a.checked) throw new Error('발행 기사의 편집 확인이 없습니다.');
  return { lead: a.lead as string | null, returning: a.returning as string | null, outgoing: a.outgoing as string | null,
    extra: a.extra as string | null, checked: a.checked, publishedAt: a.publishedAt as string | null };
}
