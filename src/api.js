import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getRouteRisk     = (payload) => api.post('/route-risk', payload).then(r => r.data);
export const getSearchHistory = ()        => api.get('/search-history').then(r => r.data);
export const getGridStats     = ()        => api.get('/grid-stats').then(r => r.data);
export const getNext90Forecast    = ()        => api.get('/forecast/next90').then(r => r.data);
export const getSeasonCrashStats  = ()        => api.get('/season-crash-stats').then(r => r.data);

export const authLogin      = (data) => api.post('/auth/login', data).then(r => r.data);
export const authRegister   = (data) => api.post('/auth/register', data).then(r => r.data);
export const getProfile     = ()     => api.get('/auth/profile').then(r => r.data);
export const changePassword = (data) => api.put('/auth/change-password', data).then(r => r.data);

export const getApprovedReports = ()              => api.get('/reports/approved').then(r => r.data);
export const getMyReports       = ()              => api.get('/reports/my').then(r => r.data);
export const getAllReports       = ()              => api.get('/reports/all').then(r => r.data);
export const createReport = (formData) =>
  api.post('/reports', formData).then(r => r.data);
export const updateReportStatus = (id, status, adminNote) =>
  api.put(`/reports/${id}/status`, null, { params: { status, adminNote } }).then(r => r.data);
export const getReportStats      = () => api.get('/reports/stats').then(r => r.data);
export const getHourlyGridStats  = () => api.get('/hourly-grid-stats').then(r => r.data);
export const deleteReport        = (id) => api.delete(`/reports/${id}`).then(r => r.data);