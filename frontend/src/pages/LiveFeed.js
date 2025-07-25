import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import apiService from '../services/api';
import { getAuthToken } from '../utils/auth';
import { handleApiError } from '../utils/helpers';

const LiveFeed = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [frame, setFrame] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    loadCameras();
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedCameraId) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [selectedCameraId]);

  const loadCameras = async () => {
    setLoading(true);
    setError('');

    try {
      const camerasData = await apiService.getCameras();
      setCameras(camerasData);
      if (camerasData.length > 0) {
        setSelectedCameraId(camerasData[0].id);
      }
    } catch (err) {
      setError(handleApiError(err, 'Failed to load cameras'));
    } finally {
      setLoading(false);
    }
  };

  const connect = () => {
    if (!selectedCameraId) return;
    
    disconnect(); // Close existing connection
    
    const token = getAuthToken();
    if (!token) {
      setConnectionError('No authentication token found');
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/video_feed/${selectedCameraId}?token=${token}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        setConnectionError('');
      };

      ws.current.onmessage = (event) => {
        setFrame(event.data);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket Disconnected', event.code, event.reason);
        setIsConnected(false);
        if (event.code !== 1000) { // Not a normal closure
          setConnectionError('Connection lost. Attempting to reconnect...');
          // Auto-reconnect after 3 seconds
          setTimeout(() => {
            if (selectedCameraId) {
              connect();
            }
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setIsConnected(false);
        setConnectionError('Connection error occurred');
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect to video stream');
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    setIsConnected(false);
    setFrame(null);
    setConnectionError('');
  };

  const handleCameraChange = (cameraId) => {
    setSelectedCameraId(cameraId);
  };

  const getSelectedCamera = () => {
    return cameras.find(cam => cam.id === selectedCameraId);
  };

  if (loading) {
    return (
      <Layout title="Live Video Feed" subtitle="Real-time camera streams">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Live Video Feed" subtitle="Real-time camera streams">
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Live Video Feed" subtitle="Real-time camera streams">
      <div className="space-y-6">
        {/* Camera Selection */}
        <Card title="Camera Selection">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="camera-select" className="block text-sm font-medium text-gray-300 mb-2">
                Select Camera:
              </label>
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a camera...</option>
                {cameras.map(camera => (
                  <option key={camera.id} value={camera.id}>
                    {camera.camera_name} (ID: {camera.id}) - {camera.status || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </Card>

        {/* Video Feed */}
        {selectedCameraId && (
          <Card title={`Camera: ${getSelectedCamera()?.camera_name || 'Unknown'}`}>
            <div className="space-y-4">
              {connectionError && (
                <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded">
                  {connectionError}
                </div>
              )}
              
              <div className="bg-black rounded-md overflow-hidden aspect-video w-full border-2 border-gray-700">
                {isConnected && frame ? (
                  <img 
                    src={`data:image/jpeg;base64,${frame}`} 
                    alt="Live video feed" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      {!selectedCameraId ? (
                        <p>Please select a camera to view the live feed</p>
                      ) : !isConnected ? (
                        <div>
                          <LoadingSpinner className="mb-4" />
                          <p>Connecting to camera...</p>
                        </div>
                      ) : (
                        <p>Waiting for video frame...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedCameraId && (
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <div>
                    <p>Camera ID: {selectedCameraId}</p>
                    <p>Status: {getSelectedCamera()?.status || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p>Location: {getSelectedCamera()?.location || 'N/A'}</p>
                    <p>Resolution: {getSelectedCamera()?.resolution || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Camera List */}
        <Card title="Available Cameras">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map(camera => (
              <div 
                key={camera.id} 
                className={`p-4 rounded-md border cursor-pointer transition-colors ${
                  selectedCameraId === camera.id 
                    ? 'border-indigo-500 bg-indigo-900/20' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => handleCameraChange(camera.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{camera.camera_name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    camera.status === 'running' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {camera.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">ID: {camera.id}</p>
                <p className="text-sm text-gray-400">Location: {camera.location || 'N/A'}</p>
              </div>
            ))}
          </div>
          
          {cameras.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No cameras available.</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default LiveFeed;