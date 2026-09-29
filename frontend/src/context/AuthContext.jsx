import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service.js';
import { getStoredToken, clearStoredToken } from '../services/api.js';
import { AuthContext } from './authContextInstance.js';
import { runSync } from '../services/syncEngine.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('vetassist_auth') || localStorage.getItem('vetassist_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Verify session on mount with /api/auth/me
  useEffect(() => {
    async function verifySession() {
      const existingToken = getStoredToken();
      if (!existingToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await authService.getMe();
        setUser(profile);
      } catch {
        console.warn('Session verification failed, logging out.');
        setUser(null);
        setToken(null);
        clearStoredToken();
      } finally {
        setLoading(false);
      }
    }

    verifySession();

    // Listen for unauthorized 401 events dispatched by API client
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('vetassist:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('vetassist:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    setToken(res.token);
    // Automatically upload any pending records saved while offline
    setTimeout(() => {
      runSync();
    }, 500);
    return res;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...updatedFields };
      try {
        sessionStorage.setItem('vetassist_auth', JSON.stringify(merged));
        localStorage.setItem('vetassist_auth', JSON.stringify(merged));
      } catch (e) {
        console.warn('Storage update failed:', e);
      }
      return merged;
    });
  }, []);

  const updateSession = useCallback((newToken, newUser) => {
    if (newToken) {
      setToken(newToken);
    }
    if (newUser) {
      setUser(newUser);
      try {
        sessionStorage.setItem('vetassist_auth', JSON.stringify(newUser));
        localStorage.setItem('vetassist_auth', JSON.stringify(newUser));
      } catch (e) {
        console.warn('Storage update failed:', e);
      }
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    updateUser,
    updateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
