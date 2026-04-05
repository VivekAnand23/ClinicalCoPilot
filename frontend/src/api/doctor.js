import { api } from './client';

export const doctorAPI = {
  getPatients: (filter = 'active') => api.get(`/doctor/patients?filter=${filter}`),
  getPatientReports: (patientId) => api.get(`/doctor/patients/${patientId}/reports`),
  createNote: (reportId, noteText, flagOverride) =>
    api.post('/doctor/notes', {
      report_id: reportId,
      note_text: noteText,
      flag_override: flagOverride,
    }),
  updateNote: (noteId, updates) => api.patch(`/doctor/notes/${noteId}`, updates),
  markReportViewed: (reportId) => api.post(`/doctor/reports/${reportId}/view`, {}),
};
