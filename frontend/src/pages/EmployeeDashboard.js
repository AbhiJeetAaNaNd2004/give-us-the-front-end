import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Badge, LoadingSpinner, Alert, Table, TableRow, TableCell } from '../components/UI';
import { userAPI } from '../services/api';

const EmployeeDashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch attendance logs and current status
      const [attendanceResponse, statusResponse] = await Promise.all([
        userAPI.getMyAttendance(),
        userAPI.getMyStatus()
      ]);

      setAttendanceData(attendanceResponse.data || []);
      setCurrentStatus(statusResponse.data || null);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to load employee data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="default">Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'active':
      case 'present':
      case 'in':
        return <Badge variant="success">Present</Badge>;
      case 'inactive':
      case 'absent':
      case 'out':
        return <Badge variant="danger">Absent</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return `${diffHours.toFixed(1)} hours`;
  };

  const getTodayAttendance = () => {
    const today = new Date().toDateString();
    return attendanceData.find(record => 
      new Date(record.check_in || record.timestamp).toDateString() === today
    );
  };

  if (loading) {
    return (
      <Layout title="Employee Dashboard">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const todayAttendance = getTodayAttendance();

  return (
    <Layout title="Employee Dashboard" currentPage="dashboard">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Status Card */}
        <Card title="Current Status">
          <div className="text-center">
            <div className="mb-4">
              {getStatusBadge(currentStatus?.status || 'Unknown')}
            </div>
            <p className="text-sm text-gray-400">
              Last Updated: {formatDateTime(currentStatus?.last_seen || currentStatus?.timestamp)}
            </p>
          </div>
        </Card>

        {/* Today's Attendance */}
        <Card title="Today's Attendance">
          <div className="space-y-3">
            {todayAttendance ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check In:</span>
                  <span className="text-white">{formatTime(todayAttendance.check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check Out:</span>
                  <span className="text-white">{formatTime(todayAttendance.check_out)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Working Hours:</span>
                  <span className="text-white">{calculateWorkingHours(todayAttendance.check_in, todayAttendance.check_out)}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center">No attendance record for today</p>
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card title="This Month">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Days Present:</span>
              <span className="text-white">
                {attendanceData.filter(record => {
                  const recordDate = new Date(record.check_in || record.timestamp);
                  const currentMonth = new Date().getMonth();
                  return recordDate.getMonth() === currentMonth;
                }).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Records:</span>
              <span className="text-white">{attendanceData.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance History */}
      <Card title="Attendance History">
        {attendanceData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table headers={['Date', 'Check In', 'Check Out', 'Working Hours', 'Status']}>
              {attendanceData.slice(0, 10).map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(record.check_in || record.timestamp)}</TableCell>
                  <TableCell>{formatTime(record.check_in)}</TableCell>
                  <TableCell>{formatTime(record.check_out)}</TableCell>
                  <TableCell>{calculateWorkingHours(record.check_in, record.check_out)}</TableCell>
                  <TableCell>
                    {record.check_out ? (
                      <Badge variant="success">Complete</Badge>
                    ) : (
                      <Badge variant="warning">In Progress</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            {attendanceData.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
                  Showing latest 10 records. Total: {attendanceData.length} records.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400">No attendance records found</p>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default EmployeeDashboard;