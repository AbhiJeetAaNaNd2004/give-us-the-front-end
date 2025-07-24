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
  FileInput
} from '../components/UI';
import { userAPI, faceAPI, attendanceAPI } from '../services/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [showUserFacesModal, setShowUserFacesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFaces, setUserFaces] = useState([]);

  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: ''
  });
  const [faceImage, setFaceImage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResponse, attendanceResponse, myAttendanceResponse, myStatusResponse] = await Promise.all([
        userAPI.getUsers(),
        attendanceAPI.getAllAttendance(),
        userAPI.getMyAttendance(),
        userAPI.getMyStatus()
      ]);

      setUsers(usersResponse.data || []);
      setAttendanceData(attendanceResponse.data || []);
      setMyAttendance(myAttendanceResponse.data || []);
      setMyStatus(myStatusResponse.data || null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await userAPI.createEmployee(newUser);
      setAlert({ type: 'success', message: 'Employee created successfully!' });
      setShowCreateUserModal(false);
      setNewUser({ username: '', email: '', full_name: '', password: '' });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to create employee. Please try again.' });
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

  const handleEnrollFace = async (e) => {
    e.preventDefault();
    if (!faceImage || !selectedUser) return;

    try {
      await faceAPI.enrollFace(selectedUser.id, faceImage);
      setAlert({ type: 'success', message: 'Face enrolled successfully!' });
      setShowFaceEnrollModal(false);
      setFaceImage(null);
      setSelectedUser(null);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to enroll face. Please try again.' });
    }
  };

  const handleViewUserFaces = async (user) => {
    try {
      setSelectedUser(user);
      const response = await faceAPI.getFaces(user.id);
      setUserFaces(response.data || []);
      setShowUserFacesModal(true);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load user faces.' });
    }
  };

  const handleDeleteFace = async (embeddingId) => {
    if (!window.confirm('Are you sure you want to delete this face embedding?')) return;
    
    try {
      await faceAPI.deleteEmbedding(embeddingId);
      setAlert({ type: 'success', message: 'Face embedding deleted successfully!' });
      if (selectedUser) {
        handleViewUserFaces(selectedUser);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete face embedding.' });
    }
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

  const getActiveUsers = () => {
    return users.filter(user => user.is_active);
  };

  const getTodayAttendance = () => {
    const today = new Date().toDateString();
    return attendanceData.filter(record => 
      new Date(record.check_in || record.timestamp).toDateString() === today
    );
  };

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const activeUsers = getActiveUsers();
  const todayAttendance = getTodayAttendance();

  return (
    <Layout title="Admin Dashboard" currentPage="dashboard">
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card title="Today's Attendance">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{todayAttendance.length}</div>
            <p className="text-sm text-gray-400">Check-ins Today</p>
          </div>
        </Card>

        <Card title="My Status">
          <div className="text-center">
            <div className="mb-2">
              <Badge variant={myStatus?.status === 'active' ? 'success' : 'danger'}>
                {myStatus?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">My Current Status</p>
          </div>
        </Card>
      </div>

      {/* User Management */}
      <Card title="User Management" className="mb-8">
        <div className="mb-4">
          <Button
            onClick={() => setShowCreateUserModal(true)}
            variant="primary"
            className="mb-4"
          >
            Create New Employee
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table headers={['Name', 'Username', 'Email', 'Role', 'Status', 'Actions']}>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
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
                        setShowFaceEnrollModal(true);
                      }}
                    >
                      Enroll Face
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleViewUserFaces(user)}
                    >
                      View Faces
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

      {/* Recent Attendance */}
      <Card title="Recent Attendance">
        <div className="overflow-x-auto">
          <Table headers={['User', 'Date', 'Check In', 'Check Out', 'Status']}>
            {attendanceData.slice(0, 10).map((record, index) => (
              <TableRow key={index}>
                <TableCell>{record.user_name || record.username || 'Unknown'}</TableCell>
                <TableCell>{formatDateTime(record.check_in || record.timestamp).split(',')[0]}</TableCell>
                <TableCell>{formatDateTime(record.check_in).split(',')[1]}</TableCell>
                <TableCell>{record.check_out ? formatDateTime(record.check_out).split(',')[1] : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={record.check_out ? 'success' : 'warning'}>
                    {record.check_out ? 'Complete' : 'In Progress'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create New Employee"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <InputField
            id="username"
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            required
          />
          <InputField
            id="email"
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            required
          />
          <InputField
            id="full_name"
            label="Full Name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
            required
          />
          <InputField
            id="password"
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            required
          />
          <div className="flex space-x-4 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              Create Employee
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowCreateUserModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Face Enrollment Modal */}
      <Modal
        isOpen={showFaceEnrollModal}
        onClose={() => setShowFaceEnrollModal(false)}
        title={`Enroll Face for ${selectedUser?.full_name || selectedUser?.username}`}
      >
        <form onSubmit={handleEnrollFace} className="space-y-4">
          <FileInput
            id="face_image"
            label="Face Image"
            accept="image/*"
            onChange={(e) => setFaceImage(e.target.files[0])}
            required
          />
          <div className="flex space-x-4 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              Enroll Face
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowFaceEnrollModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Faces Modal */}
      <Modal
        isOpen={showUserFacesModal}
        onClose={() => setShowUserFacesModal(false)}
        title={`Face Embeddings for ${selectedUser?.full_name || selectedUser?.username}`}
        size="lg"
      >
        <div className="space-y-4">
          {userFaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userFaces.map((face, index) => (
                <div key={face.id || index} className="border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-400">Embedding #{face.id || index + 1}</span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteFace(face.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created: {formatDateTime(face.created_at || face.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No face embeddings found for this user</p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;