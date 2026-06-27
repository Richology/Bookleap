export type WorkspaceHistoryRecordLike = {
  id: string;
  createdAt?: string;
  [key: string]: unknown;
};

type WorkspaceMetaRecord = {
  key: string;
  value: unknown;
  updatedAt: string;
};

const DB_NAME = "bookleap_workspace_v1";
const DB_VERSION = 1;
const HISTORY_STORE = "historyRecords";
const META_STORE = "meta";
const LEGACY_MIGRATION_META_KEY = "legacy_localStorage_history_migration";
let historyMirrorQueue: Promise<unknown> = Promise.resolve();

function isBrowserIndexedDbAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openWorkspaceDatabase(): Promise<IDBDatabase> {
  if (!isBrowserIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
        historyStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
  });
}

function getRecordTime(record: WorkspaceHistoryRecordLike): number {
  const time = Date.parse(record.createdAt ?? "");
  return Number.isFinite(time) ? time : 0;
}

async function getAllRecordsFromStore<T extends WorkspaceHistoryRecordLike>(
  db: IDBDatabase
): Promise<T[]> {
  const transaction = db.transaction(HISTORY_STORE, "readonly");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(HISTORY_STORE);
  const records = await requestToPromise<T[]>(store.getAll());
  await done;
  return records;
}

async function setMeta(db: IDBDatabase, key: string, value: unknown) {
  const transaction = db.transaction(META_STORE, "readwrite");
  const store = transaction.objectStore(META_STORE);
  const record: WorkspaceMetaRecord = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  store.put(record);
  await transactionDone(transaction);
}

export async function getIndexedDbHistoryRecords<T extends WorkspaceHistoryRecordLike>() {
  const db = await openWorkspaceDatabase();
  try {
    const records = await getAllRecordsFromStore<T>(db);
    return records.sort((a, b) => getRecordTime(b) - getRecordTime(a));
  } finally {
    db.close();
  }
}

export async function migrateLegacyHistoryRecordsToIndexedDb<T extends WorkspaceHistoryRecordLike>(
  legacyRecords: T[]
) {
  if (legacyRecords.length === 0) {
    return { importedCount: 0, totalCount: 0 };
  }

  const db = await openWorkspaceDatabase();

  try {
    const existingRecords = await getAllRecordsFromStore<T>(db);
    const mergedById = new Map(existingRecords.map((record) => [record.id, record]));
    let importedCount = 0;

    for (const record of legacyRecords) {
      if (!record?.id) continue;

      const existing = mergedById.get(record.id);
      if (!existing || getRecordTime(record) >= getRecordTime(existing)) {
        mergedById.set(record.id, record);
        importedCount += 1;
      }
    }

    const mergedRecords = Array.from(mergedById.values());
    const transaction = db.transaction([HISTORY_STORE, META_STORE], "readwrite");
    const historyStore = transaction.objectStore(HISTORY_STORE);
    const metaStore = transaction.objectStore(META_STORE);

    for (const record of mergedRecords) {
      historyStore.put(record);
    }

    metaStore.put({
      key: LEGACY_MIGRATION_META_KEY,
      value: {
        importedCount,
        legacyCount: legacyRecords.length,
        totalCount: mergedRecords.length,
      },
      updatedAt: new Date().toISOString(),
    } satisfies WorkspaceMetaRecord);

    await transactionDone(transaction);

    return {
      importedCount,
      totalCount: mergedRecords.length,
    };
  } finally {
    db.close();
  }
}

async function writeHistoryRecordsToIndexedDb<T extends WorkspaceHistoryRecordLike>(
  records: T[]
) {
  const db = await openWorkspaceDatabase();

  try {
    const transaction = db.transaction([HISTORY_STORE, META_STORE], "readwrite");
    const historyStore = transaction.objectStore(HISTORY_STORE);
    const metaStore = transaction.objectStore(META_STORE);

    historyStore.clear();
    for (const record of records) {
      if (record?.id) {
        historyStore.put(record);
      }
    }

    metaStore.put({
      key: "localStorage_history_mirror",
      value: {
        recordCount: records.length,
      },
      updatedAt: new Date().toISOString(),
    } satisfies WorkspaceMetaRecord);

    await transactionDone(transaction);
    return { recordCount: records.length };
  } finally {
    db.close();
  }
}

export function mirrorHistoryRecordsToIndexedDb<T extends WorkspaceHistoryRecordLike>(
  records: T[]
) {
  const recordsSnapshot = records.map((record) => ({ ...record }));
  historyMirrorQueue = historyMirrorQueue
    .catch(() => undefined)
    .then(() => writeHistoryRecordsToIndexedDb(recordsSnapshot));

  return historyMirrorQueue;
}

export async function markIndexedDbStorageReady() {
  const db = await openWorkspaceDatabase();
  try {
    await setMeta(db, "storage_ready", { version: DB_VERSION });
  } finally {
    db.close();
  }
}
