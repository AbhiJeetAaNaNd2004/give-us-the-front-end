import React, { useState, useEffect, useRef } from 'react';

// --- Helper Components for UI ---
const ActionButton = ({ onClick, disabled, children, variant = 'primary', fullWidth = false }) => {
  const baseClasses = "px-4 py-2 text-sm font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-400",
    secondary: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-400",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}>
      {children}
    </button>
  );
};

const InputField = ({ id, label, type, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">{label}</label>
        <div className="mt-1">
            <input
                id={id}
                name={id}
                type={type}
                required
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
        </div>
    </div>
);


// --- Login Component ---
const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // FastAPI's OAuth2PasswordRequestForm expects form data, not JSON
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('http://localhost:8000/auth/token', {
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

            const data = await response.json();
            onLoginSuccess(data.access_token, data.role);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-400">System Login</h1>
                    <p className="text-lg text-gray-400 mt-2">Enter your credentials to access the system.</p>
                </header>
                <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField id="username" label="Username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your.username" />
                        <InputField id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                        
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <div>
                            <ActionButton type="submit" disabled={isLoading} fullWidth={true}>
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </ActionButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


// --- Video Stream Component ---
const VideoStreamPage = ({ token, userRole, onLogout }) => {
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [frame, setFrame] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);

    // Fetch the list of available cameras when the component mounts
    useEffect(() => {
        const fetchCameras = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/cameras', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Could not fetch cameras.');
                const data = await response.json();
                setCameras(data);
                if (data.length > 0) {
                    setSelectedCameraId(data[0].id); // Default to the first camera
                }
            } catch (error) {
                console.error("Error fetching cameras:", error);
            }
        };
        fetchCameras();
    }, [token]);

    // Function to connect to the WebSocket
    const connect = () => {
        if (!selectedCameraId || !token) return;
        
        // The token is now passed as a query parameter
        const wsUrl = `ws://localhost:8000/ws/video_feed/${selectedCameraId}?token=${token}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
        };
        ws.current.onmessage = (event) => setFrame(event.data);
        ws.current.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
        };
        ws.current.onerror = (err) => {
            console.error("WebSocket Error:", err);
            setIsConnected(false);
        };
    };
    
    // Function to disconnect
    const disconnect = () => {
        if (ws.current) {
            ws.current.close();
        }
    };

    // Effect to manage connection/disconnection
    useEffect(() => {
        if (selectedCameraId) {
            connect();
        }
        return () => disconnect(); // Cleanup on component unmount or ID change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCameraId, token]);


    return (
         <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-indigo-400">Live Video Stream</h1>
                        <p className="text-md text-gray-400">Role: {userRole}</p>
                    </div>
                    <ActionButton onClick={onLogout} variant="secondary">Logout</ActionButton>
                </header>

                <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                        <label htmlFor="camera-select" className="text-sm font-medium">Select Camera:</label>
                        <select
                            id="camera-select"
                            value={selectedCameraId}
                            onChange={(e) => setSelectedCameraId(e.target.value)}
                            className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                        >
                            {cameras.length > 0 ? (
                                cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.camera_name} (ID: {cam.id})</option>)
                            ) : (
                                <option>Loading cameras...</option>
                            )}
                        </select>
                    </div>
                     <div className="bg-black rounded-md overflow-hidden aspect-video w-full border-2 border-gray-700">
                        {isConnected && frame ? (
                            <img src={`data:image/jpeg;base64,${frame}`} alt="Live video feed" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <p>{isConnected ? 'Waiting for frame...' : 'Disconnected. Check camera selection.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component (Controller) ---
export default function App() {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));

    const handleLoginSuccess = (newToken, newUserRole) => {
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('userRole', newUserRole);
        setToken(newToken);
        setUserRole(newUserRole);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        setToken(null);
        setUserRole(null);
    };

    // Determine which page to show based on whether a token exists
    if (!token || !userRole) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    // Check if the user has the correct role to view the video stream
    if (userRole === 'admin' || userRole === 'super_admin') {
        return <VideoStreamPage token={token} userRole={userRole} onLogout={handleLogout} />;
    } else {
        // Employee view (you can build this component next)
        return (
            <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
                <h1 className="text-3xl font-bold text-indigo-400">Employee Dashboard</h1>
                <p className="text-lg text-gray-400 mt-2">Welcome! Your role ({userRole}) does not have permission to view live streams.</p>
                <div className="mt-8">
                    <ActionButton onClick={handleLogout} variant="secondary">Logout</ActionButton>
                </div>
            </div>
        );
    }
}
