import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import apiService from '../services/api';
import { getUserRole, canAccessAdminFeatures, canAccessSuperAdminFeatures } from '../utils/auth';
import { formatDateTime, getStatusColor, getStatusText, handleApiError } from '../utils/helpers';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    userStatus: null,
    totalEmployees: 0,
    activeCameras: 0,
    trackerStatus: null,
    recentAttendance: []
  });

  const userRole = getUserRole();
  const isAdmin = canAccessAdminFeatures();
  const isSuperAdmin = canAccessSuperAdminFeatures();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load user status for all roles
      const userStatus = await apiService.getUserStatus();
      
      let totalEmployees = 0;
      let activeCameras = 0;
      let trackerStatus = null;
      let recentAttendance = [];

      // Load additional data for admin and super admin
      if (isAdmin) {
        const [users, cameras, attendance] = await Promise.all([
          apiService.getAllUsers(),
          apiService.getCameras(),
          apiService.getAllAttendanceLogs()
        ]);
        
        totalEmployees = users.length;
        activeCameras = cameras.filter(cam => cam.status === 'running').length;
        recentAttendance = attendance.slice(0, 5); // Show last 5 entries
      }

      // Load tracker status for super admin
      if (isSuperAdmin) {
        trackerStatus = await apiService.getTrackerStatus();
      }

      setDashboardData({
        userStatus,
        totalEmployees,
        activeCameras,
        trackerStatus,
        recentAttendance
      });
    } catch (err) {
      setError(handleApiError(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="System Overview">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard" subtitle="System Overview">
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" subtitle="System Overview">
      <div className="space-y-6">
        {/* User Status Card - For all roles */}
        <Card title="My Status">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current Status</p>
              <p className={`text-lg font-semibold ${getStatusColor(dashboardData.userStatus?.status)}`}>
                {getStatusText(dashboardData.userStatus?.status)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Last Activity</p>
              <p className="text-sm text-gray-300">
                {formatDateTime(dashboardData.userStatus?.last_event_time)}
              </p>
            </div>
          </div>
        </Card>

        {/* Admin/Super Admin Statistics */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Total Employees">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-400">{dashboardData.totalEmployees}</p>
                <p className="text-sm text-gray-400">Registered Users</p>
              </div>
            </Card>

            <Card title="Active Cameras">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{dashboardData.activeCameras}</p>
                <p className="text-sm text-gray-400">Currently Running</p>
              </div>
            </Card>

            {isSuperAdmin && dashboardData.trackerStatus && (
              <Card title="Tracker Status">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getStatusColor(dashboardData.trackerStatus.status)}`}>
                    {getStatusText(dashboardData.trackerStatus.status)}
                  </p>
                  <p className="text-sm text-gray-400">Recognition Service</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Recent Attendance - For admin and super admin */}
        {isAdmin && dashboardData.recentAttendance.length > 0 && (
          <Card title="Recent Attendance">
            <div className="space-y-3">
              {dashboardData.recentAttendance.map((record, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                  <div>
                    <p className="font-medium text-white">{record.user_name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-400">{formatDateTime(record.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(record.event_type)}`}>
                      {getStatusText(record.event_type)}
                    </p>
                    <p className="text-xs text-gray-500">{record.camera_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Employee-specific welcome message */}
        {!isAdmin && (
          <Card title="Welcome">
            <div className="text-center py-8">
              <p className="text-lg text-gray-300">Welcome to the Face Recognition System</p>
              <p className="text-sm text-gray-400 mt-2">
                Use the navigation menu to view your attendance records and current status.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;