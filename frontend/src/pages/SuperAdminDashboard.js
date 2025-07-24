import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Card, 
  Badge, 
  LoadingSpinner, 
  Alert, 
  Table, 
  TableRow, 
  TableCell, 
  Button, 
  Modal,
  InputField,
  SelectField
} from '../components/UI';
import { userAPI, cameraAPI, trackerAPI, attendanceAPI } from '../services/api';

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [trackerStatus, setTrackerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  // Modal states
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingCamera, setEditingCamera] = useState(null);

  // Form states
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    full_name: '',
    password: ''
  });
  const [cameraForm, setCameraForm] = useState({
    camera_name: '',
    location: '',
    stream_url: '',
    is_active: true
  });
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResponse, camerasResponse, attendanceResponse, trackerResponse] = await Promise.all([
        userAPI.getUsers(),
        cameraAPI.getCameras(),
        attendanceAPI.getAllAttendance(),
        trackerAPI.getTrackerStatus().catch(() => ({ data: { status: 'unknown' } }))
      ]);

      setUsers(usersResponse.data || []);
      setCameras(camerasResponse.data || []);
      setAttendanceData(attendanceResponse.data || []);
      setTrackerStatus(trackerResponse.data || null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await userAPI.createAdmin(newAdmin);
      setAlert({ type: 'success', message: 'Admin created successfully!' });
      setShowCreateAdminModal(false);
      setNewAdmin({ username: '', email: '', full_name: '', password: '' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to create admin. Please try again.' });
    }
  };

  const handleChangeRole = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newRole) return;

    try {
      await userAPI.changeUserRole(selectedUser.id, newRole);
      setAlert({ type: 'success', message: 'User role changed successfully!' });
      setShowRoleChangeModal(false);
      setSelectedUser(null);
      setNewRole('');
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to change user role. Please try again.' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userAPI.deleteUser(userId);
      setAlert({ type: 'success', message: 'User deleted successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete user. Please try again.' });
    }
  };

  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await cameraAPI.updateCamera(editingCamera.id, cameraForm);
        setAlert({ type: 'success', message: 'Camera updated successfully!' });
      } else {
        await cameraAPI.createCamera(cameraForm);
        setAlert({ type: 'success', message: 'Camera created successfully!' });
      }
      setShowCameraModal(false);
      resetCameraForm();
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to save camera. Please try again.' });
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;
    
    try {
      await cameraAPI.deleteCamera(cameraId);
      setAlert({ type: 'success', message: 'Camera deleted successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete camera. Please try again.' });
    }
  };

  const handleStartTracker = async () => {
    try {
      await trackerAPI.startTracker();
      setAlert({ type: 'success', message: 'Tracker started successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to start tracker. Please try again.' });
    }
  };

  const handleStopTracker = async () => {
    try {
      await trackerAPI.stopTracker();
      setAlert({ type: 'success', message: 'Tracker stopped successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to stop tracker. Please try again.' });
    }
  };

  const handleStartCamera = async (cameraId) => {
    try {
      await cameraAPI.startCamera(cameraId);
      setAlert({ type: 'success', message: 'Camera started successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to start camera. Please try again.' });
    }
  };

  const handleStopCamera = async (cameraId) => {
    try {
      await cameraAPI.stopCamera(cameraId);
      setAlert({ type: 'success', message: 'Camera stopped successfully!' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to stop camera. Please try again.' });
    }
  };

  const resetCameraForm = () => {
    setCameraForm({
      camera_name: '',
      location: '',
      stream_url: '',
      is_active: true
    });
    setEditingCamera(null);
  };

  const openEditCamera = (camera) => {
    setEditingCamera(camera);
    setCameraForm({
      camera_name: camera.camera_name || '',
      location: camera.location || '',
      stream_url: camera.stream_url || '',
      is_active: camera.is_active
    });
    setShowCameraModal(true);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout title="Super Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const activeUsers = users.filter(user => user.is_active);
  const activeCameras = cameras.filter(camera => camera.is_active);
  const todayAttendance = attendanceData.filter(record => 
    new Date(record.check_in || record.timestamp).toDateString() === new Date().toDateString()
  );

  return (
    <Layout title="Super Admin Dashboard" currentPage="dashboard">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card title="Total Users">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-400 mb-2">{users.length}</div>
            <p className="text-sm text-gray-400">Registered Users</p>
          </div>
        </Card>

        <Card title="Active Users">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{activeUsers.length}</div>
            <p className="text-sm text-gray-400">Currently Active</p>
          </div>
        </Card>

        <Card title="Cameras">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{cameras.length}</div>
            <p className="text-sm text-gray-400">Total Cameras</p>
          </div>
        </Card>

        <Card title="Active Cameras">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{activeCameras.length}</div>
            <p className="text-sm text-gray-400">Currently Active</p>
          </div>
        </Card>

        <Card title="Tracker Status">
          <div className="text-center">
            <div className="mb-2">
              <Badge variant={trackerStatus?.status === 'running' ? 'success' : 'danger'}>
                {trackerStatus?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">System Status</p>
          </div>
        </Card>
      </div>

      {/* System Control */}
      <Card title="System Control" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Tracker Control</h4>
            <div className="flex space-x-4">
              <Button
                onClick={handleStartTracker}
                variant="success"
                disabled={trackerStatus?.status === 'running'}
              >
                Start Tracker
              </Button>
              <Button
                onClick={handleStopTracker}
                variant="danger"
                disabled={trackerStatus?.status !== 'running'}
              >
                Stop Tracker
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Current Status: {trackerStatus?.status || 'Unknown'}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
            <div className="flex space-x-4">
              <Button
                onClick={() => setShowCreateAdminModal(true)}
                variant="primary"
              >
                Create Admin
              </Button>
              <Button
                onClick={() => {
                  resetCameraForm();
                  setShowCameraModal(true);
                }}
                variant="primary"
              >
                Add Camera
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Camera Management */}
      <Card title="Camera Management" className="mb-8">
        <div className="overflow-x-auto">
          <Table headers={['Name', 'Location', 'Status', 'Actions']}>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell>{camera.camera_name || `Camera ${camera.id}`}</TableCell>
                <TableCell>{camera.location || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={camera.is_active ? 'success' : 'danger'}>
                    {camera.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openEditCamera(camera)}
                    >
                      Edit
                    </Button>
                    {camera.is_active ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStopCamera(camera.id)}
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleStartCamera(camera.id)}
                      >
                        Start
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteCamera(camera.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      </Card>

      {/* User Management */}
      <Card title="User Management" className="mb-8">
        <div className="overflow-x-auto">
          <Table headers={['Name', 'Username', 'Email', 'Role', 'Status', 'Actions']}>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'super_admin' ? 'info' : user.role === 'admin' ? 'success' : 'default'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'success' : 'danger'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role);
                        setShowRoleChangeModal(true);
                      }}
                    >
                      Change Role
                    </Button>
                    {user.role === 'employee' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      </Card>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        title="Create New Admin"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <InputField
            id="username"
            label="Username"
            value={newAdmin.username}
            onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
            required
          />
          <InputField
            id="email"
            label="Email"
            type="email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
            required
          />
          <InputField
            id="full_name"
            label="Full Name"
            value={newAdmin.full_name}
            onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
            required
          />
          <InputField
            id="password"
            label="Password"
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
            required
          />
          <div className="flex space-x-4 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              Create Admin
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowCreateAdminModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Camera Modal */}
      <Modal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        title={editingCamera ? 'Edit Camera' : 'Add New Camera'}
      >
        <form onSubmit={handleSaveCamera} className="space-y-4">
          <InputField
            id="camera_name"
            label="Camera Name"
            value={cameraForm.camera_name}
            onChange={(e) => setCameraForm({...cameraForm, camera_name: e.target.value})}
            required
          />
          <InputField
            id="location"
            label="Location"
            value={cameraForm.location}
            onChange={(e) => setCameraForm({...cameraForm, location: e.target.value})}
          />
          <InputField
            id="stream_url"
            label="Stream URL"
            value={cameraForm.stream_url}
            onChange={(e) => setCameraForm({...cameraForm, stream_url: e.target.value})}
          />
          <SelectField
            id="is_active"
            label="Status"
            value={cameraForm.is_active.toString()}
            onChange={(e) => setCameraForm({...cameraForm, is_active: e.target.value === 'true'})}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
          <div className="flex space-x-4 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              {editingCamera ? 'Update Camera' : 'Create Camera'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowCameraModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={showRoleChangeModal}
        onClose={() => setShowRoleChangeModal(false)}
        title={`Change Role for ${selectedUser?.full_name || selectedUser?.username}`}
      >
        <form onSubmit={handleChangeRole} className="space-y-4">
          <SelectField
            id="new_role"
            label="New Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'admin', label: 'Admin' },
              { value: 'super_admin', label: 'Super Admin' }
            ]}
            required
          />
          <div className="flex space-x-4 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              Change Role
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowRoleChangeModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default SuperAdminDashboard;