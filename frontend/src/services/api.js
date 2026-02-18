import axios from 'axios';
import { getApiUrl } from './config';

const api = axios.create({
    baseURL: getApiUrl(),
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000, // 30s timeout for slow remote networks
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((res) => res, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    // Better error messages for network issues
    if (error.code === 'ECONNABORTED') {
        error.message = 'Request timed out — check your network connection';
    } else if (!error.response) {
        error.message = 'Cannot reach server — check if backend is running';
    }
    return Promise.reject(error);
});

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    getUsers: () => api.get('/auth/users'),
};

export const projectsAPI = {
    getAll: () => api.get('/projects'),
    getOne: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    addMember: (id, data) => api.post(`/projects/${id}/members`, data),
    removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

export const tasksAPI = {
    getAll: (projectId) => api.get(`/tasks/project/${projectId}`),
    getOne: (id) => api.get(`/tasks/${id}`),
    create: (projectId, data) => api.post(`/tasks/project/${projectId}`, data),
    update: (id, data) => api.put(`/tasks/${id}`, data),
    delete: (id) => api.delete(`/tasks/${id}`),
    addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
};

export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getNotifications: () => api.get('/dashboard/notifications'),
    markRead: (id) => api.put(`/dashboard/notifications/${id}/read`),
    markAllRead: () => api.put('/dashboard/notifications/read-all'),
};

export const messagesAPI = {
    getAll: (projectId) => api.get(`/messages/project/${projectId}`),
    // socketId is passed so backend excludes sender from broadcast (prevents duplicates)
    send: (projectId, data, socketId) => api.post(`/messages/project/${projectId}`, data, {
        headers: socketId ? { 'x-socket-id': socketId } : {},
    }),
    getPinned: (projectId) => api.get(`/messages/project/${projectId}/pinned`),
    pin: (id) => api.put(`/messages/${id}/pin`),
    unpin: (id) => api.delete(`/messages/${id}/pin`),
};

export const activityAPI = {
    getAll: (projectId) => api.get(`/activity/project/${projectId}`),
};

export const pollsAPI = {
    getAll: (projectId) => api.get(`/polls/project/${projectId}`),
    create: (projectId, data) => api.post(`/polls/project/${projectId}`, data),
    vote: (pollId, optionId) => api.post(`/polls/${pollId}/vote`, { optionId }),
};

export default api;

