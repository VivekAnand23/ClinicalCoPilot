import { api } from './client';

export const analysisAPI = {
  run: (reportId) => api.post(`/analysis/${reportId}/run`),
  get: (reportId) => api.get(`/analysis/${reportId}`),
};
