const MIRROR_KEY = 'pg_sync_queue';
const DB_NAME = 'promogrind-sync';
const STORE = 'queue';
const MAX_ITEMS = 20;

let _dbPromise = null;
let _idbDead = false;

function _hasIdb() {
  if (_idbDead) return false;
  try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
}

function _openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); }
    catch (error) { _idbDead = true; reject(error); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { _idbDead = true; reject(req.error); };
  }).catch((error) => { _dbPromise = null; throw error; });
  return _dbPromise;
}

function _readMirror() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MIRROR_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function _writeMirror(queue) {
  try { localStorage.setItem(MIRROR_KEY, JSON.stringify(queue)); } catch {}
}

async function _idbRead() {
  const db = await _openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error);
  });
}

async function _idbWrite(queue) {
  const db = await _openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const item of queue) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadQueue() {
  if (_hasIdb()) {
    try { const rows = await _idbRead(); _writeMirror(rows); return rows; } catch {}
  }
  return _readMirror();
}

export async function saveQueue(queue) {
  const trimmed = Array.isArray(queue) ? queue.slice(-MAX_ITEMS) : [];
  _writeMirror(trimmed);
  if (_hasIdb()) { try { await _idbWrite(trimmed); } catch {} }
  return trimmed;
}

export async function enqueueWrite(item) {
  const existing = await loadQueue();
  return saveQueue([...existing, { ...item, queuedAt: item.queuedAt ?? Date.now() }]);
}

export function getQueueDepthSync() {
  return _readMirror().length;
}

export function __resetForTests() { _dbPromise = null; _idbDead = false; }
