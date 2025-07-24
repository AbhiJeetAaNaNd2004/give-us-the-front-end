import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
    
    return response.json();
  },
};

// User APIs
export const userAPI = {
  getUsers: () => api.get('/users'),
  createEmployee: (userData) => api.post('/users/create/employee', userData),
  createAdmin: (userData) => api.post('/users/create/admin', userData),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  changeUserRole: (userId, newRole) => api.put(`/users/${userId}/role`, { role: newRole }),
  getMyAttendance: () => api.get('/me/attendance'),
  getMyStatus: () => api.get('/me/status'),
};

// Face APIs
export const faceAPI = {
  enrollFace: (userId, imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    return api.post(`/faces/enroll/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getFaces: (userId) => api.get(`/faces/${userId}`),
  deleteEmbedding: (embeddingId) => api.delete(`/faces/${embeddingId}`),
};

// Camera APIs
export const cameraAPI = {
  getCameras: () => api.get('/cameras'),
  createCamera: (cameraData) => api.post('/cameras', cameraData),
  updateCamera: (cameraId, cameraData) => api.put(`/cameras/${cameraId}`, cameraData),
  deleteCamera: (cameraId) => api.delete(`/cameras/${cameraId}`),
  startCamera: (cameraId) => api.post(`/cameras/${cameraId}/start`),
  stopCamera: (cameraId) => api.post(`/cameras/${cameraId}/stop`),
  
  // Tripwire APIs
  getTripwires: (cameraId) => api.get(`/cameras/${cameraId}/tripwires`),
  createTripwire: (cameraId, tripwireData) => api.post(`/cameras/${cameraId}/tripwires`, tripwireData),
  updateTripwire: (cameraId, tripwireId, tripwireData) => api.put(`/cameras/${cameraId}/tripwires/${tripwireId}`, tripwireData),
  deleteTripwire: (cameraId, tripwireId) => api.delete(`/cameras/${cameraId}/tripwires/${tripwireId}`),
};

// Tracker APIs
export const trackerAPI = {
  startTracker: () => api.post('/tracker/start'),
  stopTracker: () => api.post('/tracker/stop'),
  getTrackerStatus: () => api.get('/tracker/status'),
};

// Attendance APIs
export const attendanceAPI = {
  getAllAttendance: () => api.get('/attendance'),
  getUserAttendance: (userId) => api.get(`/attendance/${userId}`),
};

// WebSocket helper
export const createVideoWebSocket = (cameraId, token, onMessage, onOpen, onClose, onError) => {
  const wsUrl = `ws://localhost:8000/ws/video_feed/${cameraId}?token=${token}`;
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = onOpen || (() => console.log('WebSocket connected'));
  ws.onmessage = onMessage || ((event) => console.log('WebSocket message:', event.data));
  ws.onclose = onClose || (() => console.log('WebSocket disconnected'));
  ws.onerror = onError || ((error) => console.error('WebSocket error:', error));
  
  return ws;
};

export default api;