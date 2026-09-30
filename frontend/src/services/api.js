/**
 * Centralized API Client for VetAssist Frontend
 * Handles JWT in sessionStorage/memory, request authentication, and 401 redirection
 */

const TOKEN_KEY = 'vetassist_jwt_token';

// Base URL from environment — supports both VITE_API_BASE_URL and VITE_API_URL, strips trailing slashes/api
const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
let cleanApiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';
if (cleanApiBase.endsWith('/api')) {
  cleanApiBase = cleanApiBase.slice(0, -4);
}
const API_BASE = cleanApiBase;

// In-memory token cache
let inMemoryToken = null;

export function getStoredToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    inMemoryToken = token;
    return token;
  } catch {
    return inMemoryToken;
  }
}

export function setStoredToken(token) {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token); // Keep persistent across tabs
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Storage access failed:', e);
  }
}

export function clearStoredToken() {
  inMemoryToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('vetassist_auth');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('vetassist_auth');
    localStorage.removeItem('vetassist_auth_token');
  } catch (e) {
    console.warn('Storage clear failed:', e);
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  // Prepend API_BASE so requests go directly to backend (bypasses Vite proxy issues)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized - redirect to /login
    if (response.status === 401) {
      if (!url.includes('/api/auth/login')) {
        clearStoredToken();
        window.dispatchEvent(new CustomEvent('vetassist:unauthorized'));
      }
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join(', ') : 'Request failed');
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or connection refused
    throw new ApiError(
      `Unable to connect to the backend server at ${API_BASE || window.location.origin}. Please ensure the backend is running on port 5000.`,
      0,
      null
    );
  }
}

export const api = {
  get: (url, params) => {
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
      });
      const qs = searchParams.toString();
      if (qs) finalUrl += `?${qs}`;
    }
    return request(finalUrl, { method: 'GET' });
  },
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  delete: (url, params) => {
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      finalUrl += `?${searchParams.toString()}`;
    }
    return request(finalUrl, { method: 'DELETE' });
  },
};

export default api;
