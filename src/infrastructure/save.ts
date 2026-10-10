import { validateState, type GameState } from '../domain/state';

const CURRENT = 'medical-quest.v4.current';
const BACKUPS = ['medical-quest.v4.backup1', 'medical-quest.v4.backup2'];
const CORRUPT = 'medical-quest.v4.corrupt-original';
const BACKUP_GAP_MS = 90_000;

export type LoadResult = { state: GameState | null; error: string | null };

/** localStorage store: one current slot plus two rotating known-good backups. */
export class SaveStore {
  private lastBackupAt = 0;
  constructor(private storage: Storage) {}

  load(): LoadResult {
    let raw: unknown;
    try { raw = this.read(CURRENT); } catch { raw = undefined; }
    if (raw === null) return { state: null, error: null };
    try {
      if (raw === undefined) throw new Error('저장 파일이 손상되었어요.');
      return { state: validateState(raw), error: null };
    } catch (e) {
      const original = this.storage.getItem(CURRENT);
      if (original) this.storage.setItem(CORRUPT, original);
      for (const k of BACKUPS) { try { const b = this.read(k); if (b) return { state: validateState(b), error: '현재 저장을 읽지 못해 최근 백업으로 복구했어요. 원본은 따로 보관했어요.' }; } catch { /* next */ } }
      return { state: null, error: (e instanceof Error ? e.message : '저장을 읽지 못했어요.') + ' 원본은 따로 보관했어요.' };
    }
  }

  save(state: GameState): void {
    validateState(state);
    const prev = this.storage.getItem(CURRENT);
    const now = Date.now();
    if (prev && now - this.lastBackupAt > BACKUP_GAP_MS) {
      try {
        validateState(JSON.parse(prev));
        const b1 = this.storage.getItem(BACKUPS[0]!);
        if (b1) this.storage.setItem(BACKUPS[1]!, b1);
        this.storage.setItem(BACKUPS[0]!, prev);
        this.lastBackupAt = now;
      } catch { /* never rotate a broken save into backups */ }
    }
    this.storage.setItem(CURRENT, JSON.stringify(state));
  }

  backups(): GameState[] {
    const out: GameState[] = [];
    for (const k of BACKUPS) { try { const b = this.read(k); if (b) out.push(validateState(b)); } catch { /* skip */ } }
    return out;
  }

  clear(): void { this.storage.removeItem(CURRENT); }

  private read(key: string): unknown {
    const v = this.storage.getItem(key);
    return v === null ? null : JSON.parse(v);
  }
}
