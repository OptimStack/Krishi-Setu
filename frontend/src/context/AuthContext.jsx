import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      if (response?.error) {
        const errorMsg =
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Login failed';
        return { success: false, error: errorMsg };
      }

      if (!response?.data) {
        return { success: false, error: 'Login failed: invalid response' };
      }

      const { access_token, refresh_token, user: userData } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || err?.message || 'Login failed';
      return { success: false, error: msg };
    }
  };

  const register = async (data) => {
    try {
      const response = await authApi.register(data);
      if (response?.error) {
        const errorMsg =
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Registration failed';
        return { success: false, error: errorMsg };
      }

      if (!response?.data) {
        return { success: false, error: 'Registration failed: invalid response' };
      }

      const { access_token, refresh_token, user: userData } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || err?.message || 'Registration failed';
      return { success: false, error: msg };
    }
  };


  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
