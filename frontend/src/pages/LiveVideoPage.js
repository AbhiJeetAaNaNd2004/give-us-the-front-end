import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, Button, SelectField, Badge, Alert, LoadingSpinner } from '../components/UI';
import { cameraAPI, createVideoWebSocket } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LiveVideoPage = () => {
  const { token } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [frame, setFrame] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const wsRef = useRef(null);

  useEffect(() => {
    fetchCameras();
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedCameraId && token) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [selectedCameraId, token]);

  const fetchCameras = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await cameraAPI.getCameras();
      const cameraList = response.data || [];
      setCameras(cameraList);
      
      if (cameraList.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cameraList[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Failed to load cameras. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const connect = () => {
    if (!selectedCameraId || !token) return;
    
    disconnect(); // Ensure any existing connection is closed
    
    setConnectionStatus('connecting');
    
    try {
      wsRef.current = createVideoWebSocket(
        selectedCameraId,
        token,
        // onMessage
        (event) => {
          setFrame(event.data);
          if (!isConnected) {
            setIsConnected(true);
            setConnectionStatus('connected');
          }
        },
        // onOpen
        () => {
          console.log('WebSocket Connected');
          setIsConnected(true);
          setConnectionStatus('connected');
          setError(null);
        },
        // onClose
        () => {
          console.log('WebSocket Disconnected');
          setIsConnected(false);
          setConnectionStatus('disconnected');
          setFrame(null);
        },
        // onError
        (error) => {
          console.error('WebSocket Error:', error);
          setIsConnected(false);
          setConnectionStatus('error');
          setError('Failed to connect to video stream. Please check camera status.');
        }
      );
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to establish video connection.');
      setConnectionStatus('error');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setFrame(null);
  };

  const handleCameraChange = (e) => {
    const newCameraId = e.target.value;
    setSelectedCameraId(newCameraId);
  };

  const handleReconnect = () => {
    setError(null);
    connect();
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'connecting':
        return <Badge variant="warning">Connecting...</Badge>;
      case 'error':
        return <Badge variant="danger">Error</Badge>;
      default:
        return <Badge variant="default">Disconnected</Badge>;
    }
  };

  const selectedCamera = cameras.find(cam => cam.id.toString() === selectedCameraId);

  if (isLoading) {
    return (
      <Layout title="Live Video Feed">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Live Video Feed" currentPage="video">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="space-y-6">
        {/* Camera Controls */}
        <Card title="Camera Controls">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <SelectField
              id="camera-select"
              label="Select Camera"
              value={selectedCameraId}
              onChange={handleCameraChange}
              options={[
                { value: '', label: 'Select a camera...' },
                ...cameras.map(cam => ({
                  value: cam.id.toString(),
                  label: `${cam.camera_name || `Camera ${cam.id}`} (ID: ${cam.id})`
                }))
              ]}
              disabled={cameras.length === 0}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Connection Status
              </label>
              <div className="flex items-center h-10">
                {getConnectionStatusBadge()}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleReconnect}
                variant="primary"
                disabled={!selectedCameraId || connectionStatus === 'connecting'}
              >
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
              </Button>
              <Button
                onClick={disconnect}
                variant="secondary"
                disabled={!isConnected}
              >
                Disconnect
              </Button>
            </div>
          </div>

          {selectedCamera && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Camera Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white ml-2">{selectedCamera.camera_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">ID:</span>
                  <span className="text-white ml-2">{selectedCamera.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white ml-2">
                    <Badge variant={selectedCamera.is_active ? 'success' : 'danger'}>
                      {selectedCamera.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white ml-2">{selectedCamera.location || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Video Feed */}
        <Card title="Live Video Stream">
          <div className="relative">
            <div className="bg-black rounded-lg overflow-hidden aspect-video w-full border-2 border-gray-700 relative">
              {isConnected && frame ? (
                <img 
                  src={`data:image/jpeg;base64,${frame}`} 
                  alt="Live video feed" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    {connectionStatus === 'connecting' ? (
                      <div className="flex flex-col items-center space-y-4">
                        <LoadingSpinner size="lg" />
                        <p>Connecting to camera...</p>
                      </div>
                    ) : connectionStatus === 'connected' ? (
                      <div className="flex flex-col items-center space-y-4">
                        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p>Waiting for video frame...</p>
                      </div>
                    ) : connectionStatus === 'error' ? (
                      <div className="flex flex-col items-center space-y-4">
                        <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p>Connection error. Please try reconnecting.</p>
                      </div>
                    ) : !selectedCameraId ? (
                      <div className="flex flex-col items-center space-y-4">
                        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p>Please select a camera to view the live feed</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                        <p>Disconnected. Click reconnect to start streaming.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Connection Status Overlay */}
              <div className="absolute top-4 right-4">
                {getConnectionStatusBadge()}
              </div>
              
              {/* Camera Info Overlay */}
              {selectedCamera && (
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
                  {selectedCamera.camera_name || `Camera ${selectedCamera.id}`}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stream Information */}
        {isConnected && (
          <Card title="Stream Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Camera ID:</span>
                <span className="text-white ml-2">{selectedCameraId}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-white ml-2">Live</span>
              </div>
              <div>
                <span className="text-gray-400">Format:</span>
                <span className="text-white ml-2">JPEG Stream</span>
              </div>
              <div>
                <span className="text-gray-400">Connection:</span>
                <span className="text-white ml-2">WebSocket</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default LiveVideoPage;