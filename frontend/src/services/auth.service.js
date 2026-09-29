import api, { setStoredToken, clearStoredToken } from './api.js';

export const authService = {
  async login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.token) {
      setStoredToken(res.token);
      sessionStorage.setItem('vetassist_auth', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe() {
    const res = await api.get('/api/auth/me');
    if (res.user) {
      sessionStorage.setItem('vetassist_auth', JSON.stringify(res.user));
    }
    return res.user;
  },

  async changePassword(currentPassword, newPassword) {
    return api.post('/api/auth/change-password', { currentPassword, newPassword });
  },

  async updateCredentials({ currentPassword, newEmail, newPassword }) {
    const res = await api.put('/api/auth/credentials', { currentPassword, newEmail, newPassword });
    if (res.token) {
      setStoredToken(res.token);
      sessionStorage.setItem('vetassist_auth', JSON.stringify(res.user));
      localStorage.setItem('vetassist_auth', JSON.stringify(res.user));
    }
    return res;
  },

  logout() {
    clearStoredToken();
  },
};

export default authService;
