import { TermDefinition_Response } from '@glossarly/shared';

interface CacheEntry {
  term: string;
  definition: TermDefinition_Response;
  timestamp: number;
}

export class LocalTermCache {
  private dbName = 'glossarly-cache';
  private storeName = 'terms';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'term' });
        }
      };
    });
  }

  async getTerm(termText: string): Promise<TermDefinition_Response | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(termText.toLowerCase());

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        resolve(entry ? entry.definition : null);
      };
    });
  }

  async saveTerm(definition: TermDefinition_Response): Promise<void> {
    if (!this.db) await this.init();

    const entry: CacheEntry = {
      term: definition.term.toLowerCase(),
      definition,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllTerms(): Promise<TermDefinition_Response[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        resolve(entries.map((e) => e.definition));
      };
    });
  }

  async clearOldEntries(olderThanDays: number): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          if (entry.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}
