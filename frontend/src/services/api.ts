import axios from 'axios';
import { AnalysisRecord, AuthResponse, SystemHealthResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't trigger session expired if it's the actual login call itself failing
      if (!error.config.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { usernameOrEmail: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
  register: async (userData: { username: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

export const analysisApi = {
  upload: async (file: File, modelVersion = 'yolov8n-afv-v1.0'): Promise<AnalysisRecord> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_version', modelVersion);

    const response = await api.post<AnalysisRecord>('/analyses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getById: async (id: string): Promise<AnalysisRecord> => {
    const response = await api.get<AnalysisRecord>(`/analyses/${id}`);
    return response.data;
  },
  getHistory: async (): Promise<AnalysisRecord[]> => {
    const response = await api.get<AnalysisRecord[]>('/analyses');
    return response.data;
  },
  getImageUrl: (id: string): string => {
    return `/api/analyses/${id}/image`;
  },
};

export const systemApi = {
  getHealth: async (): Promise<SystemHealthResponse> => {
    const response = await api.get<SystemHealthResponse>('/system/health');
    return response.data;
  },
};

export default api;
