import { portrait } from '../art/character';
import { levelOf } from '../domain/quest';
import type { GameState } from '../domain/state';
import { REAL_CYCLE, SLOW, beat, ecg, openness, phaseAt } from '../domain/cardiac';
import { isHeartRoom, type RoomId } from '../world/types';
import { ICONS, button, el } from './dom';

export type HudActions = { onChip: () => void; onNote: () => void; onMenu: () => void; onMap: () => void };

export class Hud {
  root = el('div', 'hud');
  private chip: HTMLButtonElement;
  private portraitBox = el('div', 'portrait');
  private nameEl = el('span', 'name');
  private goldEl = el('span', 'coin');
  private quest = el('section', 'quest glass');
  private questText = el('p');
  private mini = el('div', 'minimap glass');
  private miniCanvas = el('canvas');
  private banner = el('div', 'banner glass');
  private levelEl = el('span', '', 'Lv.1 수습기자');
  private toastEl = el('div', 'toast glass');
  private saveError = el('div', 'save-error glass hidden');
  private lastSaveError: string | null | undefined;
  private cycle = el('section', 'cycle glass hidden');
  private cycleCanvas = el('canvas');
  private cyclePhase = el('b');
  private avPill = el('span', 'pill', '방실판');
  private slPill = el('span', 'pill', '반달판');
  private cycleNote = el('p');
  private lastPhase = '';
  private hintEl = el('div', 'hint glass', '화면을 누르면 걸어가요 · 사람이나 물건을 누르면 다가가서 말을 걸어요');
  private lookKey = '';
  private toastTimer = 0;
  private bannerTimer = 0;
  private miniBase: HTMLCanvasElement | null = null;

  constructor(private a: HudActions) {
    this.chip = button('chip glass', '', a.onChip, '기자 정보');
    const who = el('span', 'who');
    const rank = el('span', 'rank'); rank.append(this.levelEl, this.goldEl);
    who.append(this.nameEl, rank);
    this.chip.append(this.portraitBox, who);

    const head = button('', '', () => this.quest.classList.toggle('closed'), '현재 목표 접기/펼치기');
    head.append(el('span', 'tag', '현재 목표'), el('span', 'chev', '▾'));
    this.quest.append(head, this.questText);

    const tr = el('div', 'topright');
    const row = el('div', 'btnrow');
    const note = button('iconbtn glass', '', a.onNote, '취재 수첩'); note.innerHTML = ICONS.note + '<span>수첩</span>';
    const menu = button('iconbtn glass', '', a.onMenu, '메뉴'); menu.innerHTML = ICONS.menu + '<span>메뉴</span>';
    row.append(note, menu);
    this.mini.append(this.miniCanvas);
    this.mini.setAttribute('role', 'button'); this.mini.setAttribute('aria-label', '동네 지도 크게 보기'); this.mini.tabIndex = 0;
    this.mini.addEventListener('click', e => { e.stopPropagation(); a.onMap(); });
    this.mini.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); a.onMap(); } });
    const ch = el('div', 'cycle-head'); ch.append(this.cyclePhase, el('small', '', '×' + SLOW + ' 느리게'));
    const pills = el('div', 'pills'); pills.append(this.avPill, this.slPill);
    this.cycle.append(ch, this.cycleCanvas, pills, this.cycleNote);
    this.cycle.setAttribute('role', 'button'); this.cycle.setAttribute('aria-label', '심장 주기 · 눌러서 심장 길 안내 열기'); this.cycle.tabIndex = 0;
    this.cycle.addEventListener('click', e => { e.stopPropagation(); a.onMap(); });
    this.cycle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); a.onMap(); } });
    tr.append(row, this.mini, this.cycle);

    this.saveError.setAttribute('role', 'status');
    this.root.append(this.chip, this.quest, tr, this.banner, this.toastEl, this.hintEl, this.saveError);
    this.root.addEventListener('pointerdown', e => { if (e.target !== this.root) e.stopPropagation(); });
    document.body.append(this.root);
    window.setTimeout(() => { this.hintEl.style.opacity = '0'; }, 9000);
  }

  setVisible(v: boolean): void { this.root.classList.toggle('hidden', !v); }
  focusReporter(): void { this.chip.focus({ preventScroll: true }); }

  setSaveError(error: string | null): void {
    if (this.lastSaveError === error) return;
    this.lastSaveError = error;
    const text = error ? '저장 주의 · ' + error : '';
    if (this.saveError.textContent !== text) this.saveError.textContent = text;
    this.saveError.classList.toggle('hidden', !error);
    this.hintEl.classList.toggle('hidden', !!error);
  }

  update(s: GameState): void {
    this.nameEl.textContent = s.avatar.name;
    this.goldEl.textContent = s.gold.toLocaleString('ko-KR') + 'G';
    const lv = levelOf(s.totalXp);
    this.levelEl.textContent = 'Lv.' + lv.level + ' 수습기자 · ' + lv.into + '/' + lv.need + 'XP';
    const key = JSON.stringify(s.avatar.look);
    if (key !== this.lookKey) {
      this.lookKey = key;
      const c = portrait(s.avatar.look), copy = el('canvas'); copy.width = c.width; copy.height = c.height;
      const g = copy.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0);
      this.portraitBox.replaceChildren(copy);
    }
  }

  setObjective(text: string): void {
    if (this.questText.textContent === text) return;
    const changed = this.questText.textContent !== '';
    this.questText.textContent = text;
    if (changed) { this.quest.classList.remove('closed', 'pulse'); void this.quest.offsetWidth; this.quest.classList.add('pulse'); }
  }

  setRoom(room: RoomId, minimapBase: () => HTMLCanvasElement): void {
    const street = room === 'street', heart = isHeartRoom(room);
    this.mini.classList.toggle('hidden', !street);
    this.cycle.classList.toggle('hidden', !heart);
    this.root.classList.toggle('in-heart', heart);
    this.cycle.classList.toggle('lung', room === 'lung');
    this.lastPhase = '';
    if (street && !this.miniBase) { this.miniBase = minimapBase(); this.miniCanvas.width = this.miniBase.width; this.miniCanvas.height = this.miniBase.height; }
  }

  drawMinimap(px: number, py: number, t: number): void {
    if (!this.miniBase || this.mini.classList.contains('hidden')) return;
    const g = this.miniCanvas.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(this.miniBase, 0, 0);
    const x = Math.round(px / 8), y = Math.round(py / 8);
    g.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(t * 6)) + ')'; g.fillRect(x - 3, y - 3, 7, 7);
    g.fillStyle = '#ff5a6e'; g.fillRect(x - 2, y - 2, 5, 5); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3);
  }

  /** Cardiac cycle panel: lead-II–like trace over one beat, a cursor, the phase and which valves are open. */
  drawCycle(real: number, dpr: number): void {
    if (this.cycle.classList.contains('hidden')) return;
    const cv = this.cycleCanvas, w = Math.round(cv.clientWidth * dpr) || 1, h = Math.round(cv.clientHeight * dpr) || 1;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    const X = (c: number) => (c / REAL_CYCLE) * w, Y = (v: number) => h * 0.72 - v * h * 0.6;
    const ph = phaseAt(real);
    g.fillStyle = 'rgba(255,120,140,0.10)';
    g.fillRect(X(ph.from), 0, X(ph.to) - X(ph.from), h);
    g.strokeStyle = 'rgba(127,220,202,0.25)'; g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
    const c = beat(real);
    g.lineWidth = 1.6 * dpr; g.lineJoin = 'round';
    g.strokeStyle = '#7fdcca'; g.beginPath();
    for (let x = 0; x <= w; x += Math.max(1, dpr)) { const v = ecg((x / w) * REAL_CYCLE); if (x === 0) g.moveTo(x, Y(v)); else g.lineTo(x, Y(v)); }
    g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(X(c) - dpr, 0, 2 * dpr, h);
    g.beginPath(); g.arc(X(c), Y(ecg(c)), 2.6 * dpr, 0, Math.PI * 2); g.fill();
    if (ph.id + ph.from !== this.lastPhase) {
      this.lastPhase = ph.id + ph.from;
      this.cyclePhase.textContent = ph.name;
      this.cycleNote.textContent = ph.note;
    }
    this.avPill.classList.toggle('on', openness('av', real) > 0.5);
    this.slPill.classList.toggle('on', openness('sl', real) > 0.5);
  }

  showBanner(text: string): void {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('show'), 2600);
  }

  toast(text: string, error = false): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.toggle('error', error);
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), error ? 5200 : 2400);
  }
}
