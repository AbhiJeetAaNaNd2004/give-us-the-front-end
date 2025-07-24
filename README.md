# Face Recognition Attendance System

A comprehensive real-time face recognition attendance system with role-based access control, built with FastAPI backend and React frontend. The system provides automated attendance tracking through camera-based face recognition, live video streaming, and comprehensive user management.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Face Recognition System                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)           │  Backend (FastAPI)                │
│  ├── Employee Dashboard     │  ├── Authentication API           │
│  ├── Admin Dashboard        │  ├── User Management API          │
│  ├── Super Admin Dashboard  │  ├── Face Recognition Engine      │
│  ├── Live Video Streaming   │  ├── Camera Management API        │
│  ├── Attendance Management  │  ├── WebSocket Video Streaming    │
│  └── Role-based Access      │  └── Real-time Tracking System    │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)      │  AI/ML Components                 │
│  ├── Users & Roles          │  ├── InsightFace (Face Analysis)  │
│  ├── Face Embeddings        │  ├── FAISS (Vector Search)        │
│  ├── Attendance Records     │  ├── ByteTracker (Object Tracking)│
│  ├── Camera Configuration   │  ├── OpenCV (Computer Vision)     │
│  └── System Settings        │  └── PyTorch (Deep Learning)      │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Key Features

### 🎯 Core Functionality
- **Real-time Face Recognition**: Advanced AI-powered face detection and recognition
- **Automated Attendance Tracking**: Seamless check-in/check-out via face recognition
- **Multi-Camera Support**: Simultaneous processing from multiple camera sources
- **Live Video Streaming**: Real-time WebSocket-based video feeds with annotations
- **Role-Based Access Control**: Three-tier access system (Employee, Admin, Super Admin)

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication system
- **Password Hashing**: BCrypt-based secure password storage
- **Role-Based Permissions**: Granular access control based on user roles
- **Protected Routes**: Frontend and backend route protection

### 📊 Management Features
- **User Management**: Complete CRUD operations for user accounts
- **Face Enrollment**: Upload and manage face embeddings for recognition
- **Camera Configuration**: Dynamic camera setup and tripwire management
- **System Control**: Start/stop tracking pipeline and individual cameras
- **Attendance Analytics**: Comprehensive attendance reporting and statistics

### 🎨 User Interface
- **Responsive Design**: Mobile-first, cross-device compatibility
- **Modern Dark Theme**: Professional UI with excellent UX
- **Real-time Updates**: Live data synchronization across all components
- **Interactive Dashboards**: Role-specific interfaces with relevant features

## 🛠️ Technology Stack

### Backend (FastAPI)
- **Framework**: FastAPI 0.116.1 with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with OAuth2 password flow
- **AI/ML Stack**:
  - InsightFace 0.7.3 - Face analysis and recognition
  - FAISS 1.7.4 - Efficient similarity search
  - ByteTracker 0.3.2 - Multi-object tracking
  - OpenCV 4.11.0 - Computer vision operations
  - PyTorch 1.13.0 - Deep learning framework
- **WebSocket**: Real-time video streaming
- **HTTP Client**: Requests with retry mechanisms

### Frontend (React)
- **Framework**: React 19.1.0 with modern hooks
- **HTTP Client**: Axios 1.11.0 for API communication
- **Routing**: React Router DOM 7.7.0 with hash-based routing
- **Styling**: Tailwind CSS utility-first framework
- **WebSocket**: Native WebSocket API for live streaming
- **State Management**: React Context API

### Database Schema
- **Users Table**: Employee information and credentials
- **Roles Table**: Role definitions and permissions
- **Face Embeddings**: Biometric data storage
- **Attendance Records**: Check-in/check-out logs
- **Cameras Table**: Camera configurations and settings
- **Departments Table**: Organizational structure

## 📦 Installation & Setup

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **PostgreSQL 12+** database server
- **CUDA-compatible GPU** (recommended for optimal performance)
- **Webcam/IP Cameras** for face recognition

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Configuration**:
   - Install PostgreSQL and create database
   - Update connection settings in `db/db_setup.py`:
   ```python
   DB_SETTINGS = {
       "dbname": "face_recognition_db",
       "user": "postgres", 
       "password": "your_password",
       "host": "localhost",
       "port": "5432"
   }
   ```

5. **Initialize Database**:
   ```bash
   python db/db_setup.py
   ```

6. **Configure System Settings**:
   - Update `config.json` with your camera and API settings
   - Set up known faces directory path
   - Configure recognition thresholds

7. **Start Backend Server**:
   ```bash
   python main.py
   ```
   Server will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API Base URL**:
   - Update `src/services/api.js` if backend runs on different host/port

4. **Start Development Server**:
   ```bash
   npm start
   ```
   Application will open on `http://localhost:3000`

5. **Build for Production**:
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Backend Configuration (`config.json`)

```json
{
  "api": {
    "base_url": "https://your-api-endpoint.com",
    "access_token": "your-api-token",
    "timeout": 10,
    "max_retries": 3
  },
  "paths": {
    "known_faces_dir": "/path/to/known/faces",
    "attendance_log": "attendance_log.csv"
  },
  "tuning": {
    "recognition_threshold": 0.6,
    "detection_threshold": 0.5,
    "match_threshold": 0.8,
    "face_quality_threshold": 0.65
  },
  "system": {
    "auto_detect_cameras": true,
    "default_gpu_id": 0,
    "default_fps": 15
  },
  "cameras": [
    {
      "camera_id": 0,
      "gpu_id": 0,
      "camera_type": "entry",
      "resolution": [640, 480],
      "fps": 15,
      "tripwires": [...]
    }
  ]
}
```

### Frontend Configuration

- **API Base URL**: Update in `src/services/api.js`
- **WebSocket URL**: Configured automatically based on API URL
- **Authentication**: JWT tokens stored in localStorage

## 👥 User Roles & Permissions

### Employee Role
- ✅ View personal attendance records
- ✅ Check current attendance status
- ✅ View personal dashboard statistics
- ❌ Access to other users' data
- ❌ System administration features

### Admin Role
- ✅ All Employee permissions
- ✅ View all users and attendance records
- ✅ Create/delete employee accounts
- ✅ Enroll and manage face embeddings
- ✅ Access live video streams
- ✅ Monitor user activity status
- ❌ System control and camera management

### Super Admin Role
- ✅ All Admin permissions
- ✅ Create admin accounts
- ✅ Change user roles
- ✅ Start/stop tracking system
- ✅ Camera management (CRUD operations)
- ✅ Configure tripwires and detection zones
- ✅ System monitoring and control

## 🔑 Default Credentials

After database initialization, use these credentials to access the system:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | admin123 |
| Admin | admin | admin123 |
| Employee | employee | employee123 |

**⚠️ Important**: Change default passwords immediately after first login.

## 🚦 API Endpoints

### Authentication
- `POST /auth/token` - User login and JWT token generation
- `GET /auth/me` - Get current user information

### User Management
- `GET /users` - List all users (Admin+)
- `POST /users/create/employee` - Create employee account (Admin+)
- `POST /users/create/admin` - Create admin account (Super Admin)
- `PUT /users/{user_id}/role` - Change user role (Super Admin)
- `DELETE /users/{user_id}` - Delete user account (Admin+)

### Face Management
- `POST /faces/enroll/{user_id}` - Enroll face embedding (Admin+)
- `GET /faces/{user_id}` - Get user's face embeddings (Admin+)
- `DELETE /faces/{embedding_id}` - Delete face embedding (Admin+)

### Attendance
- `GET /me/attendance` - Get personal attendance (All)
- `GET /me/status` - Get personal status (All)
- `GET /attendance` - Get all attendance records (Admin+)

### Camera Management
- `GET /cameras` - List cameras (Admin+)
- `POST /cameras` - Create camera (Super Admin)
- `PUT /cameras/{camera_id}` - Update camera (Super Admin)
- `DELETE /cameras/{camera_id}` - Delete camera (Super Admin)
- `POST /cameras/{camera_id}/start` - Start camera (Super Admin)
- `POST /cameras/{camera_id}/stop` - Stop camera (Super Admin)

### System Control
- `POST /tracker/start` - Start tracking system (Super Admin)
- `POST /tracker/stop` - Stop tracking system (Super Admin)
- `GET /tracker/status` - Get system status (Super Admin)

### WebSocket
- `WS /ws/video_feed/{camera_id}` - Live video stream (Admin+)

## 🎥 Camera Integration

### Supported Camera Types
- **USB Webcams**: Standard USB cameras (camera_id: 0, 1, 2...)
- **IP Cameras**: RTSP/HTTP streams
- **Built-in Cameras**: Laptop/device cameras

### Camera Configuration
1. **Automatic Detection**: System can auto-detect available cameras
2. **Manual Configuration**: Define cameras in `config.json`
3. **Dynamic Management**: Add/remove cameras via API
4. **Tripwire Setup**: Configure detection zones and crossing lines

### Face Recognition Pipeline
1. **Frame Capture**: Continuous video frame acquisition
2. **Face Detection**: AI-powered face detection in frames
3. **Face Analysis**: Extract facial features and embeddings
4. **Identity Matching**: Compare against known face database
5. **Tracking**: Multi-object tracking across frames
6. **Attendance Logging**: Automatic check-in/check-out recording

## 📊 Performance Optimization

### Backend Optimizations
- **GPU Acceleration**: CUDA support for AI models
- **Memory Pooling**: Efficient memory management for video processing
- **Kalman Filtering**: Smooth tracking predictions
- **Threading**: Parallel processing for multiple cameras
- **Connection Pooling**: Database connection optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Minimized JavaScript bundle (< 85KB gzipped)
- **Efficient Re-rendering**: React hooks optimization
- **WebSocket Management**: Automatic reconnection handling

## 🔍 Monitoring & Logging

### System Monitoring
- **Real-time Status**: Track system health and performance
- **Camera Status**: Monitor individual camera connections
- **Recognition Accuracy**: Track face recognition success rates
- **Attendance Statistics**: Comprehensive attendance analytics

### Logging
- **Application Logs**: Detailed system operation logs
- **Error Tracking**: Comprehensive error logging and handling
- **Attendance Logs**: CSV-based attendance record exports
- **User Activity**: Track user login and system usage

## 🐛 Troubleshooting

### Common Issues

**Backend Won't Start**:
- Check PostgreSQL connection
- Verify config.json exists and is valid
- Ensure all Python dependencies are installed
- Check camera permissions and availability

**Face Recognition Not Working**:
- Verify GPU drivers (CUDA) installation
- Check camera permissions
- Ensure adequate lighting conditions
- Verify face embedding database has entries

**Frontend Connection Issues**:
- Confirm backend server is running on port 8000
- Check CORS configuration
- Verify WebSocket connections
- Clear browser cache and localStorage

**Database Connection Errors**:
- Verify PostgreSQL service is running
- Check database credentials in db_setup.py
- Ensure database exists and is properly initialized
- Check network connectivity

### Performance Issues
- **Slow Recognition**: Reduce camera resolution or FPS
- **High Memory Usage**: Adjust memory pool settings
- **Network Latency**: Optimize WebSocket buffer sizes
- **Database Slow**: Add indexes, optimize queries

## 🚀 Deployment

### Development Deployment
```bash
# Backend
cd backend && python main.py

# Frontend  
cd frontend && npm start
```

### Production Deployment

**Backend (Docker)**:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend (Nginx)**:
```dockerfile
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/db
SECRET_KEY=your-secret-key
CUDA_VISIBLE_DEVICES=0

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Code Standards
- **Backend**: Follow PEP 8 Python style guide
- **Frontend**: Use ESLint and Prettier for code formatting
- **Documentation**: Update README and code comments
- **Testing**: Add tests for new features

### Development Setup
```bash
# Backend development
cd backend
pip install -r requirements.txt
python -m pytest  # Run tests

# Frontend development  
cd frontend
npm install
npm test  # Run tests
npm run lint  # Check code style
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions

### System Requirements
- **Minimum**: 4GB RAM, dual-core CPU, integrated graphics
- **Recommended**: 8GB+ RAM, quad-core CPU, dedicated GPU
- **Storage**: 2GB+ free space for system and face data

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🔄 Version History

### v1.0.0 - Initial Release
- ✅ Complete face recognition system
- ✅ Role-based authentication and authorization
- ✅ Real-time video streaming
- ✅ Comprehensive user and attendance management
- ✅ Modern React frontend with responsive design
- ✅ FastAPI backend with async support
- ✅ PostgreSQL database integration
- ✅ WebSocket live streaming
- ✅ Multi-camera support
- ✅ Production-ready deployment

## 🙏 Acknowledgments

- **InsightFace**: State-of-the-art face analysis toolkit
- **FastAPI**: Modern, fast web framework for Python
- **React**: Powerful frontend library
- **OpenCV**: Computer vision library
- **PostgreSQL**: Robust relational database
- **ByteTracker**: Multi-object tracking algorithm

---

**Built with ❤️ for modern attendance management**

For detailed component-specific documentation, see:
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)