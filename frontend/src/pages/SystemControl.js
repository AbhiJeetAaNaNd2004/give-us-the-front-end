import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import apiService from '../services/api';
import { getStatusColor, getStatusText, handleApiError } from '../utils/helpers';

const SystemControl = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackerStatus, setTrackerStatus] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    setError('');

    try {
      const [trackerData, camerasData, settingsData] = await Promise.all([
        apiService.getTrackerStatus(),
        apiService.getCameras(),
        apiService.getSystemSettings().catch(() => ({})) // Settings might not be available
      ]);

      setTrackerStatus(trackerData);
      setCameras(camerasData);
      setSystemSettings(settingsData);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load system data'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartTracker = async () => {
    setActionLoading(true);
    try {
      await apiService.startTracker();
      await loadSystemData(); // Refresh data
    } catch (err) {
      setError(handleApiError(err, 'Failed to start tracker'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopTracker = async () => {
    if (!window.confirm('Are you sure you want to stop the tracking service? This will stop all face recognition.')) {
      return;
    }

    setActionLoading(true);
    try {
      await apiService.stopTracker();
      await loadSystemData(); // Refresh data
    } catch (err) {
      setError(handleApiError(err, 'Failed to stop tracker'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCamera = async (cameraId) => {
    setActionLoading(true);
    try {
      await apiService.startCamera(cameraId);
      await loadSystemData(); // Refresh data
    } catch (err) {
      setError(handleApiError(err, 'Failed to start camera'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCamera = async (cameraId) => {
    setActionLoading(true);
    try {
      await apiService.stopCamera(cameraId);
      await loadSystemData(); // Refresh data
    } catch (err) {
      setError(handleApiError(err, 'Failed to stop camera'));
    } finally {
      setActionLoading(false);
    }
  };

  const getSystemStats = () => {
    const totalCameras = cameras.length;
    const runningCameras = cameras.filter(cam => cam.status === 'running').length;
    const stoppedCameras = totalCameras - runningCameras;

    return {
      totalCameras,
      runningCameras,
      stoppedCameras
    };
  };

  if (loading) {
    return (
      <Layout title="System Control" subtitle="Manage tracking service and system settings">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const stats = getSystemStats();

  return (
    <Layout title="System Control" subtitle="Manage tracking service and system settings">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tracker Status and Control */}
        <Card title="Face Recognition Tracker">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Service Status</h3>
                <p className={`text-2xl font-bold ${getStatusColor(trackerStatus?.status)}`}>
                  {getStatusText(trackerStatus?.status)}
                </p>
                {trackerStatus?.message && (
                  <p className="text-sm text-gray-400 mt-1">{trackerStatus.message}</p>
                )}
              </div>
              <div className="flex space-x-3">
                {trackerStatus?.status === 'running' ? (
                  <Button
                    variant="danger"
                    onClick={handleStopTracker}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Stopping...' : 'Stop Tracker'}
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    onClick={handleStartTracker}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Starting...' : 'Start Tracker'}
                  </Button>
                )}
              </div>
            </div>

            {trackerStatus?.details && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Uptime</p>
                  <p className="text-lg font-semibold text-white">
                    {trackerStatus.details.uptime || 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Processed Frames</p>
                  <p className="text-lg font-semibold text-white">
                    {trackerStatus.details.processed_frames || 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Recognition Events</p>
                  <p className="text-lg font-semibold text-white">
                    {trackerStatus.details.recognition_events || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Total Cameras">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-400">{stats.totalCameras}</p>
              <p className="text-sm text-gray-400">Configured</p>
            </div>
          </Card>

          <Card title="Running Cameras">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{stats.runningCameras}</p>
              <p className="text-sm text-gray-400">Active</p>
            </div>
          </Card>

          <Card title="Stopped Cameras">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{stats.stoppedCameras}</p>
              <p className="text-sm text-gray-400">Inactive</p>
            </div>
          </Card>
        </div>

        {/* Camera Control */}
        <Card title="Individual Camera Control">
          <div className="space-y-4">
            {cameras.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No cameras configured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cameras.map((camera) => (
                  <div key={camera.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-md">
                    <div>
                      <h4 className="font-medium text-white">{camera.camera_name}</h4>
                      <p className="text-sm text-gray-400">ID: {camera.id}</p>
                      <p className="text-sm text-gray-400">Location: {camera.location || 'N/A'}</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        camera.status === 'running' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-red-600 text-white'
                      }`}>
                        {getStatusText(camera.status)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {camera.status === 'running' ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleStopCamera(camera.id)}
                          disabled={actionLoading}
                        >
                          Stop
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleStartCamera(camera.id)}
                          disabled={actionLoading}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* System Settings */}
        <Card title="System Settings">
          <div className="space-y-4">
            {Object.keys(systemSettings).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">System settings not available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(systemSettings).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
                    <span className="text-sm font-medium text-gray-300">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-white font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* System Actions */}
        <Card title="System Actions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="success"
              onClick={() => loadSystemData()}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Refreshing...' : 'Refresh System Status'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              fullWidth
            >
              Reload Application
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SystemControl;