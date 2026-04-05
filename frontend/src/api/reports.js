import { api } from './client';

export const reportsAPI = {
  upload: (file, labName, reportDate) => {
    const formData = new FormData();
    formData.append('file', file);
    if (labName) formData.append('lab_name', labName);
    if (reportDate) formData.append('report_date', reportDate);
    return api.post('/reports/upload', formData);
  },
  list: () => api.get('/reports'),
  get: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
  share: (id, doctorEmail) => api.post(`/reports/${id}/share`, { doctor_email: doctorEmail }),
  trends: () => api.get('/reports/trends'),
  getDoctors: () => api.get('/reports/doctors'),
  removeDoctor: (doctorId) => api.delete(`/reports/doctors/${doctorId}`),
};
