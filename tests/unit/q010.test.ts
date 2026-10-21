import { describe, expect, it } from 'vitest';
import { q10Fixture } from '../helpers/q010-fixture';
import { q11Fixture } from '../helpers/q011-fixture';
import { acceptQ10, canOfferQ10, checkQ10, claimQ10, clearQ10Board, coreIds, evidenceQ10, heartGraduated, publishQ10, q10CoreLeft, q10Reward, rankOf, runQ10, selectQ10 } from '../../src/domain/q010';
import { emptyQ10, q10Claims, q10Text, validateQ10 } from '../../src/domain/q010-state';
import { answerQuiz } from '../../src/domain/mastery';
import { discoveries, hxKey } from '../../src/domain/heart';
import { publishQ10WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D108 Q010 ‘심장 졸업 특집호’: special run, core-structure check, easy special article; graduation derived from the record. */

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -20; dx <= 20; dx += 2) for (let dy = -20; dy <= 20; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const ran = (s: GameState): GameState => runQ10({ ...s, heartRun: { ...s.heartRun, runs: s.heartRun.runs + 1 } }, 'blood');
function checked(s: GameState): GameState {
  let n = { ...s, inspected: [...s.inspected, ...coreIds.map(hxKey).filter(k => !s.inspected.includes(k))] };
  for (const id of q10CoreLeft(n)) n = answerQuiz(at(n, discoveries[id]!.room as RoomId, id), id, 'name', true).state;
  return desk(n);
}
const prepared = (): GameState => checked(ran(acceptQ10(q10Fixture())));
function ready(): GameState {
  const s = evidenceQ10(evidenceQ10(claimQ10(prepared(), 'two-pumps'), 'valves'), 'two-loops');
  return checkQ10(selectQ10(selectQ10(selectQ10(s, 'lead', 'one-line'), 'analogy', 'two-pumps'), 'limit', 'analogy'));
}

describe('D108 Q010 heart graduation special issue', () => {
  it('is offered after Q009 is published, only in the newsroom, and the editor speaks the offer', () => {
    const s = q10Fixture();
    expect(validateState(s).q010).toEqual(emptyQ10());
    expect(canOfferQ10(s)).toBe(true); expect(canOfferQ10(newState())).toBe(false);
    expect(talk('editor', s).action).toBe('offer-q10');
    expect(objective(s, 'newsroom')).toContain('심장 졸업 특집호');
    expect(() => acceptQ10(at(s, 'heart', 'hx-svc'))).toThrow();
    expect(rankOf(s)).toBe('수습 기자'); expect(heartGraduated(s)).toBe(false);
  });

  it('needs one finished blood-delivery run (any grade, muscle runs do not count) and the star-less core structures', () => {
    const s = acceptQ10(q10Fixture());
    expect(runQ10(s, 'muscle').q010.runDone).toBe(false);
    expect(runQ10(q10Fixture(), 'blood').q010.runDone).toBe(false);
    expect(objective(s, 'newsroom')).toContain('특집 배달 런');
    expect(() => claimQ10(desk(s), 'two-pumps')).toThrow('배달 런');
    const r = ran(s);
    expect(r.q010.runDone).toBe(true);
    expect(q10CoreLeft(r).length).toBeGreaterThan(0);
    expect(objective(r, 'heart')).toContain('핵심 구조 확인');
    expect(() => claimQ10(desk(r), 'two-pumps')).toThrow('핵심 구조');
    const p = prepared();
    expect(q10CoreLeft(p)).toEqual([]); expect(objective(p, 'newsroom')).toContain('졸업 특집 기사');
    expect(coreIds).toHaveLength(12);
  });

  it('accepts several valid claim-evidence pairs and points to the missing record for a wrong one, never saving it', () => {
    const p = prepared();
    expect(() => claimQ10(p, 'filter')).toThrow('만들거나 거르는');
    expect(() => evidenceQ10(p, 'valves')).toThrow(q10Text.board.needClaim);
    const c = claimQ10(p, 'self-fed');
    expect(() => evidenceQ10(c, 'signal')).toThrow('필요한 기록 · 관상동맥이 심장 근육에 피를 보내요 (수첩 취재 파일 Q006)');
    expect(evidenceQ10(evidenceQ10(c, 'supply'), 'passage').q010.evidence).toEqual(['supply', 'passage']);
    expect(evidenceQ10(evidenceQ10(claimQ10(p, 'beat'), 'signal'), 'pressure').q010.evidence).toEqual(['signal', 'pressure']);
    for (const claim of q10Claims.filter(x => !x.hint)) expect(claim.supports!.length).toBeGreaterThanOrEqual(2);
    expect(claimQ10(evidenceQ10(claimQ10(p, 'two-pumps'), 'valves'), 'beat').q010.evidence).toEqual(['valves']);
    expect(clearQ10Board(c).q010).toMatchObject({ claim: null, evidence: [] });
    expect(() => selectQ10(evidenceQ10(evidenceQ10(c, 'supply'), 'passage'), 'analogy', 'tank')).toThrow('모아 두지 않아요');
  });

  it('publishes once for the existing reward (0XP·400G) with a reaction; graduation and the rank are derived from the record', () => {
    const r = ready(); expect(r.q010.checked).toBe(true);
    const p = publishQ10WithReaction(r, () => 0.5, '2026-10-21T06:00:00Z');
    expect(q10Reward).toEqual({ key: 'quest.Q010.first', xp: 0, gold: 400 });
    expect(p.totalXp).toBe(r.totalXp); expect(p.totalXp).toBe(2700); expect(levelOf(p.totalXp).level).toBe(10);
    expect(p.gold - r.gold).toBeGreaterThanOrEqual(400);
    expect(latestReaction(p)!.questId).toBe('Q010');
    expect(heartGraduated(p)).toBe(true); expect(rankOf(p)).toBe('신입 기자');
    expect(publishQ10(p)).toBe(p);
    expect(validateState(p).q010.publishedAt).toBe('2026-10-21T06:00:00Z');
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-21T07:00:00Z', 'Q010');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(objective(p, 'newsroom')).toContain('심장 졸업');
    expect(Object.keys(p)).toEqual(Object.keys(r));
  });

  it('validates saves: old saves read empty, forged boards and graduation without the core check are refused', () => {
    const old = JSON.parse(JSON.stringify(q10Fixture())); delete old.q010;
    expect(validateState(old).q010).toEqual(emptyQ10());
    expect(rankOf(validateState(q11Fixture()))).toBe('신입 기자');
    const r = ready();
    expect(validateState(r).q010).toEqual(r.q010);
    expect(() => validateQ10({ ...r.q010, claim: 'filter' })).toThrow();
    expect(() => validateQ10({ ...r.q010, evidence: ['valves', 'signal'] })).toThrow();
    expect(() => validateQ10({ ...r.q010, analogy: 'tank' })).toThrow();
    expect(() => validateQ10({ ...emptyQ10(), accepted: true, claim: 'two-pumps' })).toThrow();
    expect(() => validateState({ ...r, mastery: {} })).toThrow();
    expect(() => validateState({ ...acceptQ10(q10Fixture()), heartRun: { ...q10Fixture().heartRun, runs: 0 }, q010: { ...emptyQ10(), accepted: true, runDone: true } })).toThrow();
  });

  it('keeps the basic-course contract: no numbers on screen, no new or advanced-only disease', () => {
    expect(q10Text.tier).toBe('basic');
    const b = q10Text.board, a = q10Text.article, g = q10Text.graduation;
    const screen = [q10Text.question, ...q10Text.offer, ...Object.values(q10Text.special), ...b.claims.map(c => c.card + (c.hint ?? '')), ...b.evidence.map(e => e.card), b.needClaim, b.wrongEvidence,
      ...a.leads.map(l => l.text), ...a.analogies.map(x => x.text + (x.hint ?? '')), ...a.limitations.map(l => l.text), a.factcheck, a.reply, ...Object.values(g)].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    expect(JSON.stringify(q10Text)).not.toMatch(/협심증|심근경색|심부전|이상지질혈증|수면무호흡|고혈압|심방세동/);
  });
});
