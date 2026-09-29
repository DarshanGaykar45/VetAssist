import { useState, useCallback } from 'react';
import { getList, saveList, addRecord, updateRecord, deleteRecord } from '../utils/storage.js';

/**
 * Hook for a complete CRUD list stored in localStorage.
 * @param {string} key - Storage key
 */
export function useLocalStorageList(key) {
  const [items, setItems] = useState(() => getList(key));

  const add = useCallback((record) => {
    const newRecord = addRecord(key, record);
    setItems(getList(key));
    return newRecord;
  }, [key]);

  const update = useCallback((id, updates) => {
    updateRecord(key, id, updates);
    setItems(getList(key));
  }, [key]);

  const remove = useCallback((id) => {
    deleteRecord(key, id);
    setItems(getList(key));
  }, [key]);

  const reload = useCallback(() => {
    setItems(getList(key));
  }, [key]);

  const replace = useCallback((list) => {
    saveList(key, list);
    setItems(list);
  }, [key]);

  return { items, add, update, remove, reload, replace };
}

/**
 * Simple hook for a single stored value.
 */
export function useLocalStorageValue(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem('vetassist_' + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  });

  const set = useCallback((newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(value) : newValue;
    localStorage.setItem('vetassist_' + key, JSON.stringify(resolved));
    setValue(resolved);
  }, [key, value]);

  return [value, set];
}
