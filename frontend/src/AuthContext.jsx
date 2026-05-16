import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (name, email, password, avatarUrl) => {
    const res = await api.post('/auth/register', { name, email, password, avatarUrl });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Enviar os dados do usuário do Google para o nosso backend
      const res = await api.post('/auth/google', {
        name: user.displayName,
        email: user.email,
        avatarUrl: user.photoURL,
        googleUid: user.uid
      });

      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
    } catch (error) {
      console.error("Erro no login com Google:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
