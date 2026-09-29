import { useState, useCallback } from 'react';

let _toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message = '', duration = 3500) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title, message) => addToast('success', title, message),
    error:   (title, message) => addToast('error',   title, message),
    warning: (title, message) => addToast('warning', title, message),
    info:    (title, message) => addToast('info',    title, message),
  };

  return { toasts, toast, removeToast };
}
