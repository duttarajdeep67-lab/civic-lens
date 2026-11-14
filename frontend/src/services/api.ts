import axios from 'axios';
import {
  AuthResponse,
  User,
  Department,
  Category,
  Complaint,
  ComplaintUpdate,
  AIAnalysisResponse,
  PublicStats,
  DepartmentDashboardStats
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE}${url}`;
};

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civiclens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on login or register endpoints
      const isAuthUrl = error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      if (!isAuthUrl) {
        localStorage.removeItem('civiclens_token');
        localStorage.removeItem('civiclens_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(data: any): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('civiclens_token');
      localStorage.removeItem('civiclens_user');
    }
  }
};

export const referenceService = {
  async getDepartments(): Promise<Department[]> {
    const res = await api.get<Department[]>('/departments');
    return res.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  }
};

export const locationService = {
  async reverseGeocode(lat: number, lng: number): Promise<{ latitude: number; longitude: number; address: string }> {
    const res = await api.get('/location/reverse-geocode', { params: { lat, lng } });
    return res.data;
  }
};

export const aiService = {
  async analyzeImage(file: File, forceDemo: boolean = false): Promise<AIAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('force_demo', String(forceDemo));

    const res = await api.post<AIAnalysisResponse>('/ai/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 35000,
    });
    return res.data;
  }
};

export const complaintService = {
  async uploadImage(file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ image_url: string }>('/complaints/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async createComplaint(data: any): Promise<Complaint> {
    const res = await api.post<Complaint>('/complaints', data);
    return res.data;
  },

  async getMyComplaints(params?: { search?: string; status?: string; category_id?: string; page?: number; limit?: number }): Promise<Complaint[]> {
    const res = await api.get<Complaint[]>('/complaints/my', { params });
    return res.data;
  },

  async getComplaintDetail(id: string): Promise<Complaint> {
    const res = await api.get<Complaint>(`/complaints/${id}`);
    return res.data;
  },

  async getComplaintHistory(id: string): Promise<ComplaintUpdate[]> {
    const res = await api.get<ComplaintUpdate[]>(`/complaints/${id}/history`);
    return res.data;
  }
};

export const officerService = {
  async getDashboard(): Promise<DepartmentDashboardStats> {
    const res = await api.get<DepartmentDashboardStats>('/officer/dashboard');
    return res.data;
  },

  async getDepartmentComplaints(params?: { search?: string; status?: string; priority?: string; category_id?: string; page?: number; limit?: number }): Promise<Complaint[]> {
    const res = await api.get<Complaint[]>('/officer/complaints', { params });
    return res.data;
  },

  async getComplaintDetail(id: string): Promise<Complaint> {
    const res = await api.get<Complaint>(`/officer/complaints/${id}`);
    return res.data;
  },

  async updateStatus(id: string, data: { status: string; note?: string; resolution_image_url?: string }): Promise<Complaint> {
    const res = await api.patch<Complaint>(`/officer/complaints/${id}/status`, data);
    return res.data;
  },

  async addProgressNote(id: string, note: string): Promise<Complaint> {
    const res = await api.post<Complaint>(`/officer/complaints/${id}/updates`, { note });
    return res.data;
  },

  async uploadResolutionImage(id: string, file: File): Promise<{ resolution_image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ resolution_image_url: string }>(`/officer/complaints/${id}/resolution-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
};

export const publicService = {
  async getStats(): Promise<PublicStats> {
    const res = await api.get<PublicStats>('/public/stats');
    return res.data;
  }
};

export default api;
