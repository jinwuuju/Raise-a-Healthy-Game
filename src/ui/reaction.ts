import type { Game } from '../application/game';
import { defaultAppearance, hairFor, type HairColorId, type Preset } from '../domain/appearance';
import { portrait } from '../art/character';
import { bandFor, reactionBalance, reactionText, type Reaction } from '../domain/reaction-state';
import { levelOf } from '../domain/quest';
import { button, el, pixelCanvas } from './dom';
import { openSheet } from './sheet';

/** All animation is a presentation of a saved receipt. It never awards or rolls anything. */
export function openReaction(game: Game, result: Reaction, actions: { readArticle: () => void; exportSave: () => void }, replay = false): void {
  let dispose = () => {}, dismiss = () => {};
  const returnFocus = document.querySelector<HTMLElement>('.iconbtn[aria-label="취재 수첩"]') ?? document.querySelector<HTMLElement>('#view');
  openSheet('발행 결과 · 독자 반응', (c, close) => {
    const sheet = c.parentElement!; sheet.classList.add('reaction-sheet'); c.classList.add('keep-open');
    const band = bandFor(result.score), timers: number[] = [], frames = new Set<number>();
    let finished = false, alive = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const meta = el('p', 'reaction-meta', (replay ? '당시 독자 반응 · ' : '새 신문이 도착했어요 · ') + (result.questId ?? 'Q001') + ' · ' + result.round + '번째 발행');
    const stage = el('div', 'reaction-stage scene-' + result.scene);
    const newspaper = el('div', 'reaction-newspaper');
    newspaper.append(el('small', '', '메디컬 데스크'), el('b', '', '몸속에서 온 소식'), el('div', 'paper-lines'));
    stage.append(el('i', 'reaction-spark s1', '✦'), el('i', 'reaction-spark s2', '✦'), el('i', 'reaction-spark s3', '✦'), newspaper);
    const heading = el('h3', 'reaction-headline', band.headlines[result.headline]!);
    const score = el('div', 'reaction-score'); const number = el('b', '', '…'); score.append(el('span', '', reactionText.label), number, el('span', '', '점 · ' + band.label));
    const voices = el('div', 'reaction-voices');
    for (const voice of result.voices) {
      const profile = reactionText.profiles.find(p => p.id === voice.profile)!;
      const d = el('div', 'reader-voice');
      const index = reactionText.profiles.indexOf(profile), preset = profile.preset as Preset, look = defaultAppearance(preset);
      look.hair = hairFor(preset)[index % hairFor(preset).length]!; look.hairColor = (['ink', 'brown', 'ash', 'gold', 'chestnut', 'silver'] as HairColorId[])[index % 6]!;
      d.append(pixelCanvas(portrait(look)));
      const words = el('div'); words.append(el('b', '', profile.name + ' · ' + profile.label), el('p', '', band.quotes[voice.quote]!)); d.append(words); voices.append(d);
    }
    const growth = el('div', 'reaction-growth');
    const xp = el('b', '', '…'), gold = el('b', '', '…');
    const xpRow = el('div'); xpRow.append(el('span', '', '기자 경험치'), xp);
    const goldRow = el('div'); goldRow.append(el('span', '', result.windfall ? '뜻밖의 응원금' : '독자 응원금'), gold);
    const levelBefore = levelOf(result.xpBefore).level, levelAfter = levelOf(result.xpAfter).level;
    const level = el('p', 'reaction-level', levelAfter > levelBefore ? `Lv.${levelBefore} → Lv.${levelAfter} · 한 걸음 성장했어요!` : '새 독자들에게 기사를 전했어요');
    growth.append(xpRow, goldRow, level);
    const summary = el('p', 'reaction-summary', replay ? `이미 받은 보상 · ${result.xp}XP · 기본 ${result.baseGold}G + 응원금 ${result.bonusGold}G` : `이번 발행 · +${result.xp}XP · 기본 ${result.baseGold}G + 응원금 ${result.bonusGold}G`);
    const status = el('p', 'reaction-status'); status.setAttribute('role', 'status');
    const error = el('div', 'reaction-save-error hidden'); error.setAttribute('role', 'alert');
    const errorText = el('p'); error.append(errorText, button('secondary', '다시 저장', () => game.persist()), button('secondary', '기록 파일로 내보내기', actions.exportSave));
    const updateError = () => { error.classList.toggle('hidden', !game.lastError); errorText.textContent = game.lastError ? '기록 저장 주의 · ' + game.lastError : ''; };
    const unsub = game.subscribe(updateError); updateError();
    const layout = el('div', 'reaction-layout'); const panel = el('div', 'reaction-panel'); panel.append(heading, score, voices, growth); layout.append(stage, panel);
    c.append(meta, summary, layout, el('p', 'muted reaction-note', '게임 속 독자 반응 · 의학 내용은 검수 전 모형입니다'), status, error);
    const footer = el('div', 'reaction-actions keep-open'); sheet.append(footer);
    const leave = (read = false) => { game.seeReaction(result.round); close(); if (read) actions.readArticle(); };
    const finish = () => {
      if (!alive || finished) return;
      finished = true; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); frames.clear();
      sheet.classList.add('show-score', 'show-voices', 'show-growth', 'settled'); number.textContent = String(result.score); xp.textContent = '+' + result.xp + 'XP'; gold.textContent = '+' + result.bonusGold + 'G';
      skip.textContent = '월드로 돌아가기'; read.disabled = false;
      status.textContent = `${result.score}점 · ${result.bonusGold}G의 응원이 도착했어요.`;
    };
    const skip = button('primary', '결과 바로 보기', () => finished ? leave() : finish());
    const read = button('secondary', '기사 다시 읽기', () => leave(true)); read.disabled = true;
    footer.append(skip, read);
    dismiss = () => finished ? leave() : finish();
    const animate = (node: HTMLElement, to: number, suffix = '') => {
      const start = performance.now();
      const tick = (now: number) => {
        if (!alive || finished) return;
        const t = Math.min(1, (now - start) / 650); node.textContent = String(Math.round(to * (1 - (1 - t) ** 3))) + suffix;
        if (t < 1) { const id = requestAnimationFrame(n => { frames.delete(id); tick(n); }); frames.add(id); }
      }; tick(start);
    };
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => { if (alive && !finished) fn(); }, ms));
    const onMotion = () => { if (motion.matches) finish(); };
    const onHide = () => { if (document.hidden) finish(); };
    motion.addEventListener('change', onMotion); document.addEventListener('visibilitychange', onHide);
    dispose = () => { alive = false; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); unsub(); motion.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onHide); };
    if (replay || motion.matches) finish();
    else {
      later(500, () => { sheet.classList.add('show-score'); animate(number, result.score); });
      later(1400, () => sheet.classList.add('show-voices'));
      later(2300, () => { sheet.classList.add('show-growth'); animate(xp, result.xp, 'XP'); animate(gold, result.bonusGold, 'G'); });
      later(reactionBalance.animationMs, finish);
    }
    const focusFrame = requestAnimationFrame(() => { frames.delete(focusFrame); if (alive) skip.focus({ preventScroll: true }); }); frames.add(focusFrame);
  }, () => dispose(), { dismissOnOutside: false, onDismiss: () => dismiss(), blockRepeatedActivation: true, returnFocus });
}
