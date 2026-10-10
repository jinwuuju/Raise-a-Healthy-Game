import { validateState, type GameState } from '../domain/state';

const CURRENT = 'medical-quest.v4.current';
const BACKUPS = ['medical-quest.v4.backup1', 'medical-quest.v4.backup2'] as const;
const CORRUPT = 'medical-quest.v4.corrupt-original';
const BACKUP_GAP_MS = 90_000;

export type LoadResult = { state: GameState | null; error: string | null };

/** One current slot, two known-good backups, and a comparison against the last read/write.
 * The browser additionally holds an exclusive Web Lock for the lifetime of its writer tab.
 */
export class SaveStore {
  private lastBackupAt = 0;
  private expected: string | null | undefined;
  private blocked: string | null;
  constructor(private storage: Storage, readOnlyReason: string | null = null) { this.blocked = readOnlyReason; }

  load(): LoadResult {
    let raw: string | null;
    try { raw = this.storage.getItem(CURRENT); }
    catch {
      this.blocked = '저장 공간을 읽지 못했어요. 기존 기록을 보호하려면 접근을 복구하고 새로고침해 주세요.';
      return { state: null, error: this.blocked };
    }
    this.expected = raw;
    if (raw === null) return { state: null, error: this.blocked };
    try { return { state: validateState(JSON.parse(raw)), error: this.blocked }; }
    catch {
      let preserved = false;
      try { if (!this.blocked) { this.storage.setItem(CORRUPT, raw); preserved = true; } }
      catch { this.blocked ??= '손상 원본을 보관하지 못해 덮어쓰기를 막았어요. 저장 공간을 확보하고 새로고침해 주세요.'; }
      const note = preserved ? '원본은 따로 보관했어요.' : '손상 원본을 보관하지 못했어요. 기존 기록은 덮어쓰지 않아요.';
      for (const k of BACKUPS) {
        try {
          const b = this.read(k);
          if (b) return { state: validateState(b), error: '현재 저장을 읽지 못해 최근 백업으로 복구했어요. ' + note };
        } catch { /* Try the next backup without losing the current slot. */ }
      }
      return { state: null, error: '저장 파일이 손상되었어요. ' + note };
    }
  }

  private checkCurrent(): string | null {
    if (this.expected === undefined && !this.blocked) this.load();
    if (this.blocked) throw new Error(this.blocked);
    const prev = this.storage.getItem(CURRENT);
    if (prev !== this.expected) throw new Error('다른 탭에서 기록이 바뀌었어요. 덮어쓰지 않았어요. 파일로 내보낸 뒤 새로고침해 주세요.');
    return prev;
  }

  private backup(raw: string): void {
    const b1 = this.storage.getItem(BACKUPS[0]);
    if (b1) {
      try { validateState(JSON.parse(b1)); }
      catch { this.storage.setItem(BACKUPS[0], raw); this.lastBackupAt = Date.now(); return; }
      this.storage.setItem(BACKUPS[1], b1);
    }
    this.storage.setItem(BACKUPS[0], raw);
    this.lastBackupAt = Date.now();
  }

  save(state: GameState): void {
    const raw = JSON.stringify(validateState(state));
    const prev = this.checkCurrent();
    if (prev === raw) return;
    if (prev && Date.now() - this.lastBackupAt > BACKUP_GAP_MS) {
      let valid = false;
      try { validateState(JSON.parse(prev)); valid = true; } catch { /* Corrupt originals are preserved by load(). */ }
      if (valid) this.backup(prev);
    }
    this.storage.setItem(CURRENT, raw);
    this.expected = raw;
  }

  /** Import/restart only succeeds after the live state is backed up and the replacement is written. */
  replace(next: GameState, live: GameState): void {
    const raw = JSON.stringify(validateState(next)), previous = JSON.stringify(validateState(live));
    this.checkCurrent();
    this.backup(previous);
    this.storage.setItem(CURRENT, raw);
    this.expected = raw;
  }

  backups(): GameState[] {
    const out: GameState[] = [];
    for (const k of BACKUPS) { try { const b = this.read(k); if (b) out.push(validateState(b)); } catch { /* skip */ } }
    return out;
  }

  private read(key: string): unknown {
    const v = this.storage.getItem(key);
    return v === null ? null : JSON.parse(v);
  }
}
