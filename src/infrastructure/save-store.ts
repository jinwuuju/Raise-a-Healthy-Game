import { validateState, type GameState } from '../domain/state';
export interface SaveStore {
  load(): Promise<GameState | null>;
  commit(next: GameState, expectedRevision: number | null): Promise<void>;
  backups(): Promise<GameState[]>;
}
export class IndexedSaveStore implements SaveStore {
  private db: IDBDatabase;
  private constructor(db: IDBDatabase) { this.db = db; }
  static open(): Promise<IndexedSaveStore> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('medical-quest-foundation', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves');
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(new IndexedSaveStore(request.result));
      };
      request.onerror = () => reject(new Error('브라우저 저장소를 열지 못했습니다.'));
      request.onblocked = () => reject(new Error('다른 창에서 저장소를 사용 중입니다.'));
    });
  }
  private read(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async raw(): Promise<unknown> { return this.read('current'); }
  recover(backup: GameState): Promise<void> {
    validateState(backup);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('saves', 'readwrite'); const store = tx.objectStore('saves');
      let reason: Error | null = null;
      const request = store.get('current');
      request.onsuccess = () => {
        try {
          let invalid = false;
          try { validateState(request.result); } catch { invalid = true; }
          if (!invalid) throw new Error('현재 저장이 정상입니다. 새로고침 후 일반 복구를 사용하세요.');
          const recovered = { ...backup, revision: backup.revision + 1, updatedAt: new Date().toISOString() };
          validateState(recovered);
          store.put(request.result, 'damaged-original');
          store.put(recovered, 'current');
        } catch (error) { reason = error as Error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(reason ?? tx.error);
    });
  }
  async load(): Promise<GameState | null> {
    const raw = await this.read('current');
    return raw === undefined ? null : validateState(raw);
  }
  async backups(): Promise<GameState[]> {
    const items = await Promise.all([this.read('previous-1'), this.read('previous-2')]);
    return items.flatMap(v => { try { return v === undefined ? [] : [validateState(v)]; } catch { return []; } });
  }
  commit(next: GameState, expectedRevision: number | null): Promise<void> {
    validateState(next);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');
      let reason: Error | null = null;
      const current = store.get('current');
      current.onsuccess = () => {
        try {
          const previous = current.result === undefined ? null : validateState(current.result);
          if ((previous?.revision ?? null) !== expectedRevision || next.revision !== (expectedRevision === null ? 0 : expectedRevision + 1)) throw new Error('다른 창의 저장 변경이 감지되었습니다. 새로고침해 주세요.');
          if ((current.result as { schemaVersion?: number } | undefined)?.schemaVersion === 1) {
            const original = store.get('schema1-original');
            original.onsuccess = () => { if (original.result === undefined) store.put(current.result, 'schema1-original'); };
          }
          if((current.result as {schemaVersion?:number}|undefined)?.schemaVersion===2){const original=store.get('schema2-original');original.onsuccess=()=>{if(original.result===undefined)store.put(current.result,'schema2-original');};}
          const backup = store.get('previous-1');
          backup.onsuccess = () => {
            if (backup.result !== undefined) store.put(backup.result, 'previous-2');
            if (previous) store.put(previous, 'previous-1');
            store.put(next, 'current');
          };
        } catch (error) { reason = error as Error; tx.abort(); }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(reason ?? tx.error ?? new Error('저장 실패: 이전 상태를 유지합니다.'));
      tx.onerror = () => { /* onabort is the single failure path */ };
    });
  }
}
export async function acquireWriter(): Promise<{ writable: boolean; release: () => void }> {
  if (!navigator.locks) return { writable: false, release: () => {} };
  return new Promise(resolve => {
    void navigator.locks.request('medical-quest-foundation-writer', { ifAvailable: true }, lock => {
      if (!lock) { resolve({ writable: false, release: () => {} }); return; }
      return new Promise<void>(release => resolve({ writable: true, release }));
    }).catch(() => resolve({ writable: false, release: () => {} }));
  });
}
