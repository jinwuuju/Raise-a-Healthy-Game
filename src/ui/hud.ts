import { portrait } from '../art/character';
import type { GameState } from '../domain/state';
import type { Target } from '../world/rooms';
import type { RoomId } from '../world/types';
import { ICONS, button, el } from './dom';

export type HudActions = { onChip: () => void; onNote: () => void; onMenu: () => void; onMap: () => void; onAction: () => void };

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
  private action: HTMLButtonElement;
  private actionRing = el('span', 'ring');
  private actionCap = el('span', 'cap');
  private toastEl = el('div', 'toast glass');
  private hintEl = el('div', 'hint glass', '화면을 누르면 그곳으로 걸어가요 · 꾹 누른 채 움직이면 계속 걸어요');
  private lookKey = '';
  private toastTimer = 0;
  private bannerTimer = 0;
  private miniBase: HTMLCanvasElement | null = null;

  constructor(private a: HudActions) {
    this.chip = button('chip glass', '', a.onChip, '기자 정보');
    const who = el('span', 'who');
    const rank = el('span', 'rank'); rank.append(el('span', '', 'Lv.1 수습기자'), this.goldEl);
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
    tr.append(row, this.mini);

    this.action = button('action hidden', '', a.onAction, '상호작용');
    this.action.append(this.actionRing, this.actionCap);
    this.root.append(this.chip, this.quest, tr, this.banner, this.action, this.toastEl, this.hintEl);
    this.root.addEventListener('pointerdown', e => { if (e.target !== this.root) e.stopPropagation(); });
    document.body.append(this.root);
    window.setTimeout(() => { this.hintEl.style.opacity = '0'; }, 9000);
  }

  setVisible(v: boolean): void { this.root.classList.toggle('hidden', !v); }

  update(s: GameState): void {
    this.nameEl.textContent = s.avatar.name;
    this.goldEl.textContent = s.gold.toLocaleString('ko-KR') + 'G';
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
    const street = room === 'street';
    this.mini.classList.toggle('hidden', !street);
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

  showBanner(text: string): void {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('show'), 2600);
  }

  setAction(t: Target | null): void {
    if (!t) { this.action.classList.add('hidden'); return; }
    this.actionRing.textContent = t.verb;
    this.actionCap.textContent = t.label;
    this.action.setAttribute('aria-label', t.label + ' ' + t.verb + ' (E)');
    const wasHidden = this.action.classList.contains('hidden');
    this.action.classList.remove('hidden');
    if (wasHidden) { this.action.classList.remove('enter'); void this.action.offsetWidth; this.action.classList.add('enter'); }
  }

  toast(text: string, error = false): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.toggle('error', error);
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), error ? 5200 : 2400);
  }
}
