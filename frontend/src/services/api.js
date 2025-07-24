const API_BASE_URL = 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async authenticatedRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return this.request(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Auth endpoints
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    return this.request('/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  }

  // User endpoints
  async getCurrentUser() {
    return this.authenticatedRequest('/me');
  }

  async getUserAttendance() {
    return this.authenticatedRequest('/me/attendance');
  }

  async getUserStatus() {
    return this.authenticatedRequest('/me/status');
  }

  async getAllUsers() {
    return this.authenticatedRequest('/users');
  }

  async createUser(userData) {
    return this.authenticatedRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.authenticatedRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUserRole(userId, role) {
    return this.authenticatedRequest(`/superadmin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Face management endpoints
  async getUserFaces(userId) {
    return this.authenticatedRequest(`/users/${userId}/faces`);
  }

  async enrollFace(userId, imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);

    const token = localStorage.getItem('authToken');
    return fetch(`${this.baseURL}/users/${userId}/faces`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Face enrollment failed');
      }
      return response.json();
    });
  }

  async deleteFace(userId, faceId) {
    return this.authenticatedRequest(`/users/${userId}/faces/${faceId}`, {
      method: 'DELETE',
    });
  }

  // Camera endpoints
  async getCameras() {
    return this.authenticatedRequest('/api/cameras');
  }

  async createCamera(cameraData) {
    return this.authenticatedRequest('/superadmin/cameras', {
      method: 'POST',
      body: JSON.stringify(cameraData),
    });
  }

  async updateCamera(cameraId, cameraData) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(cameraData),
    });
  }

  async deleteCamera(cameraId) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}`, {
      method: 'DELETE',
    });
  }

  async startCamera(cameraId) {
    return this.authenticatedRequest(`/cameras/${cameraId}/start`, {
      method: 'POST',
    });
  }

  async stopCamera(cameraId) {
    return this.authenticatedRequest(`/cameras/${cameraId}/stop`, {
      method: 'POST',
    });
  }

  // Tracker endpoints
  async getTrackerStatus() {
    return this.authenticatedRequest('/tracker/status');
  }

  async startTracker() {
    return this.authenticatedRequest('/tracker/start', {
      method: 'POST',
    });
  }

  async stopTracker() {
    return this.authenticatedRequest('/tracker/stop', {
      method: 'POST',
    });
  }

  // Tripwire endpoints
  async getTripwires(cameraId) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}/tripwires`);
  }

  async createTripwire(cameraId, tripwireData) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}/tripwires`, {
      method: 'POST',
      body: JSON.stringify(tripwireData),
    });
  }

  async updateTripwire(cameraId, tripwireId, tripwireData) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}/tripwires/${tripwireId}`, {
      method: 'PUT',
      body: JSON.stringify(tripwireData),
    });
  }

  async deleteTripwire(cameraId, tripwireId) {
    return this.authenticatedRequest(`/superadmin/cameras/${cameraId}/tripwires/${tripwireId}`, {
      method: 'DELETE',
    });
  }

  // System settings
  async getSystemSettings() {
    return this.authenticatedRequest('/superadmin/settings');
  }

  // Attendance logs
  async getAllAttendanceLogs() {
    return this.authenticatedRequest('/admin/attendance');
  }
}

export default new ApiService();