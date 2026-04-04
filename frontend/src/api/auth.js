import { api } from './client';

export const authAPI = {
  register: (formData) => api.post('/auth/register', formData),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  getProfile: () => api.get('/auth/me'),
};
