/**
 * localStorage helpers for VetAssist
 * All data stored under namespaced keys.
 */

const PREFIX = 'vetassist_';

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(PREFIX + key);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
}

/* ── CRUD helpers ── */

export function getList(key) {
  return getItem(key, []);
}

export function saveList(key, list) {
  setItem(key, list);
  return list;
}

export function addRecord(key, record) {
  const list = getList(key);
  const newRecord = { ...record, id: record.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
  list.push(newRecord);
  saveList(key, list);
  return newRecord;
}

export function updateRecord(key, id, updates) {
  const list = getList(key);
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  saveList(key, list);
  return list[idx];
}

export function deleteRecord(key, id) {
  const list = getList(key);
  const filtered = list.filter(r => r.id !== id);
  saveList(key, filtered);
  return filtered;
}

export function getRecord(key, id) {
  return getList(key).find(r => r.id === id) || null;
}

/* ── Storage keys ── */
export const KEYS = {
  PATIENTS:      'patients',
  APPOINTMENTS:  'appointments',
  PRESCRIPTIONS: 'prescriptions',
  BILLING:       'billing',
  INVENTORY:     'inventory',
  DOCTORS:       'doctors',
  SETTINGS:      'settings',
  AUTH:          'auth',
  SEEDED:        'seeded',
};
