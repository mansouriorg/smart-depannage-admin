import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔒 INTERCEPTOR: Automatically add the Token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // We assume you store the token as 'adminToken' after login
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;