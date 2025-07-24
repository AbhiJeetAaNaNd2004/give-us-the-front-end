# Face Recognition System - Frontend

A comprehensive React-based frontend dashboard for the Face Recognition Attendance System, providing role-based interfaces for employees, admins, and super admins.

## 🚀 Features

### Employee Dashboard
- **Personal Attendance Tracking**: View own attendance logs and current status
- **Real-time Status**: Check current attendance status (present/absent)
- **Attendance History**: Browse personal attendance records with working hours calculation
- **Monthly Statistics**: View attendance summary for the current month

### Admin Dashboard
- **All Employee Features**: Full access to employee dashboard functionality
- **User Management**: Create, view, and delete employee accounts
- **Face Enrollment**: Upload and manage face images for employees
- **Face Management**: View and delete face embeddings for users
- **Live Video Feed**: Real-time camera stream monitoring via WebSocket
- **Attendance Oversight**: View attendance records for all employees
- **User Status Monitoring**: See who is currently active

### Super Admin Dashboard
- **All Admin Features**: Complete access to admin functionality
- **Advanced User Management**: Create admin accounts and change user roles
- **System Control**: Start/stop the entire face recognition tracking pipeline
- **Camera Management**: Add, configure, update, and delete cameras
- **Individual Camera Control**: Start/stop recognition on specific cameras
- **Tripwire Configuration**: Manage camera tripwires and detection zones
- **System Monitoring**: View system status and performance metrics

### Common Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Theme**: Modern dark UI with excellent contrast and readability
- **Real-time Updates**: Live data updates and WebSocket integration
- **Secure Authentication**: JWT-based authentication with role-based access control
- **Data Export**: Export attendance data to CSV format
- **Advanced Filtering**: Filter and search data with multiple criteria
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🛠 Technology Stack

- **React 19.1.0**: Modern React with hooks and functional components
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first CSS framework for styling
- **WebSocket**: Real-time video streaming and live updates
- **React Context API**: State management for authentication
- **React Router**: Hash-based routing for navigation

## 📦 Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## 🏗 Build for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## 🔧 Configuration

### API Base URL
The API base URL is configured in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

Update this to match your backend server URL in production.

### WebSocket Configuration
WebSocket connections for live video feeds are configured to connect to:
```javascript
const wsUrl = `ws://localhost:8000/ws/video_feed/${cameraId}?token=${token}`;
```

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Layout.js        # Main layout with navigation
│   └── UI.js           # Common UI components (buttons, inputs, etc.)
├── contexts/            # React contexts
│   └── AuthContext.js  # Authentication context
├── pages/              # Page components
│   ├── LoginPage.js    # Login interface
│   ├── EmployeeDashboard.js    # Employee dashboard
│   ├── AdminDashboard.js       # Admin dashboard
│   ├── SuperAdminDashboard.js  # Super admin dashboard
│   ├── LiveVideoPage.js        # Live video streaming
│   └── AttendancePage.js       # Attendance records
├── services/           # API services
│   └── api.js         # API client and endpoints
├── utils/             # Utility functions
├── App.js            # Main app component with routing
└── index.js          # App entry point
```

## 🔐 Authentication & Authorization

The application implements a three-tier role-based access control system:

### Roles
1. **Employee**: Basic user with access to personal data
2. **Admin**: Management user with access to user and face management
3. **Super Admin**: System administrator with full system control

### Protected Routes
- Routes are protected based on user roles
- Unauthorized access attempts redirect to appropriate error pages
- JWT tokens are automatically included in API requests

## 🎨 UI Components

### Reusable Components
- **Button**: Various styles and sizes
- **InputField**: Form inputs with validation
- **SelectField**: Dropdown selections
- **FileInput**: File upload inputs
- **Card**: Content containers
- **Modal**: Dialog boxes
- **Table**: Data tables with sorting
- **Badge**: Status indicators
- **Alert**: Notification messages
- **LoadingSpinner**: Loading indicators

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers (1024px and above)
- Tablets (768px to 1023px)
- Mobile phones (320px to 767px)

## 🔄 Real-time Features

### WebSocket Integration
- Live video streaming from cameras
- Real-time connection status updates
- Automatic reconnection handling

### Live Data Updates
- Real-time attendance status
- Live user activity monitoring
- System status updates

## 🚦 API Integration

### Endpoints Used
- `POST /auth/token` - User authentication
- `GET /users` - User management
- `GET /me/attendance` - Personal attendance
- `GET /me/status` - Personal status
- `POST /faces/enroll/{user_id}` - Face enrollment
- `GET /faces/{user_id}` - Face retrieval
- `DELETE /faces/{embedding_id}` - Face deletion
- `GET /cameras` - Camera management
- `POST /tracker/start` - Start tracking system
- `POST /tracker/stop` - Stop tracking system
- `WS /ws/video_feed/{camera_id}` - Live video stream

## 🐛 Error Handling

The application includes comprehensive error handling:
- Network errors with retry mechanisms
- Authentication errors with automatic logout
- Validation errors with user-friendly messages
- WebSocket connection errors with reconnection

## 🔍 Demo Credentials

For testing purposes, the following demo credentials are available:

| Role | Username | Password |
|------|----------|----------|
| Employee | employee | password |
| Admin | admin | password |
| Super Admin | superadmin | password |

## 🚀 Deployment

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
npm install -g serve
serve -s build
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance

The application is optimized for performance with:
- Code splitting and lazy loading
- Optimized bundle size (< 85KB gzipped)
- Efficient re-rendering with React hooks
- Memoization for expensive computations

## 🔒 Security Features

- JWT token-based authentication
- Automatic token expiration handling
- Role-based access control
- Secure API communication
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Face Recognition Attendance System and follows the same licensing terms as the parent project.

## 🆘 Support

For support and questions:
1. Check the backend API documentation
2. Review the console for error messages
3. Ensure the backend server is running
4. Verify network connectivity

## 🔄 Version History

- **v1.0.0**: Initial release with complete dashboard functionality
- Role-based authentication and authorization
- Live video streaming integration
- Comprehensive user and face management
- Real-time attendance tracking
