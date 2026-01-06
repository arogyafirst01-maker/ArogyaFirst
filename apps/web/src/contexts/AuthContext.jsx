import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { setAccessToken, clearToken } from '../utils/tokenManager.js';
import authFetch from '../utils/authFetch.js';
import { broadcastAuth, onAuthMessage } from '../utils/broadcast.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [user, setUser] = useState(null);

  const refreshUser = async () => {
    const wasIdle = status === 'idle';
    if (wasIdle) {
      setStatus('loading');
    }
    try {
      const response = await authFetch('/api/auth/me');
      if (response.ok) {
        const { data: { user: userData } } = await response.json();
        setUser(userData);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  const login = async ({ identifier, password }) => {
    const response = await authFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    const { data: { accessToken, expiresIn } } = await response.json();
    setAccessToken(accessToken, expiresIn);
    broadcastAuth({ type: 'login', accessToken, expiresIn });
    await refreshUser();
  };

  const register = async (userData) => {
    // Support both JSON and multipart FormData (for hospital registration with files)
    let role;
    let init;
    if (userData instanceof FormData) {
      role = (userData.get('role') || '').toLowerCase();
      // If this is a hospital registration with files, post to the hospital register alias which accepts multipart
      const endpoint = role === 'hospital' ? '/api/hospitals/register' : `/api/auth/register/${role}`;
      init = {
        method: 'POST',
        body: userData,
        credentials: 'include'
      };
      const response = await authFetch(endpoint, init);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      const { data: { accessToken, expiresIn } } = await response.json();
      setAccessToken(accessToken, expiresIn);
      broadcastAuth({ type: 'login', accessToken, expiresIn });
      await refreshUser();
      return;
    }

    role = userData.role.toLowerCase();
    // Use dedicated alias endpoints for labs and pharmacies to mirror hospital alias behaviour
    let endpoint;
    if (role === 'lab') endpoint = '/api/labs/register';
    else if (role === 'pharmacy') endpoint = '/api/pharmacies/register';
    else endpoint = `/api/auth/register/${role}`;
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      credentials: 'include',
    };
    const response = await authFetch(endpoint, init);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    const { data: { accessToken, expiresIn } } = await response.json();
    setAccessToken(accessToken, expiresIn);
    broadcastAuth({ type: 'login', accessToken, expiresIn });
    await refreshUser();
  };

  const logout = async () => {
    await authFetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    clearToken();
    broadcastAuth({ type: 'logout' });
    setUser(null);
    setStatus('unauthenticated');
  };

  useEffect(() => {
    refreshUser();
    const cleanup = onAuthMessage((message) => {
      if (message.type === 'login') {
        setAccessToken(message.accessToken, message.expiresIn);
        refreshUser();
      } else if (message.type === 'logout') {
        clearToken();
        setUser(null);
        setStatus('unauthenticated');
      }
    });
    return cleanup;
  }, []);

  const value = useMemo(() => ({
    status,
    user,
    login,
    register,
    logout,
    refreshUser,
  }), [status, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
