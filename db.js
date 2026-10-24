const DB_NAME = "voice-journal";
const DB_VERSION = 3;
const STORE = "entries";
const PERSONAL_WORDS_STORE = "personalWords";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.objectStoreNames.contains(STORE)
        ? req.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath: "id" });

      if (!store.indexNames.contains("date")) store.createIndex("date", "date", { unique: false });
      if (!store.indexNames.contains("type")) store.createIndex("type", "type", { unique: false });
      if (!store.indexNames.contains("questionId")) store.createIndex("questionId", "questionId", { unique: false });

      if (!db.objectStoreNames.contains(PERSONAL_WORDS_STORE)) {
        db.createObjectStore(PERSONAL_WORDS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function saveEntry(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteEntry(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPersonalWords() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PERSONAL_WORDS_STORE, "readonly");
    const req = tx.objectStore(PERSONAL_WORDS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addPersonalWord(word) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PERSONAL_WORDS_STORE, "readwrite");
    tx.objectStore(PERSONAL_WORDS_STORE).put({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      word,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deletePersonalWord(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PERSONAL_WORDS_STORE, "readwrite");
    tx.objectStore(PERSONAL_WORDS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
