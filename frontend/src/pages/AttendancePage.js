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
  InputField,
  SelectField,
  Button
} from '../components/UI';
import { attendanceAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AttendancePage = () => {
  const { role, hasRole } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [attendanceData, filters]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      let attendanceResponse;
      let usersResponse = null;

      if (hasRole('admin')) {
        // Admin and Super Admin can see all attendance
        attendanceResponse = await attendanceAPI.getAllAttendance();
        usersResponse = await userAPI.getUsers();
        setUsers(usersResponse.data || []);
      } else {
        // Employee can only see their own attendance
        attendanceResponse = await userAPI.getMyAttendance();
      }

      setAttendanceData(attendanceResponse.data || []);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendanceData];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(record => 
        (record.user_name || record.username || '').toLowerCase().includes(searchLower) ||
        (record.full_name || '').toLowerCase().includes(searchLower)
      );
    }

    // User filter
    if (filters.userId) {
      filtered = filtered.filter(record => 
        record.user_id?.toString() === filters.userId
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.check_in || record.timestamp);
        return recordDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.check_in || record.timestamp);
        return recordDate <= toDate;
      });
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(record => {
        if (filters.status === 'complete') {
          return record.check_out;
        } else if (filters.status === 'in_progress') {
          return !record.check_out;
        }
        return true;
      });
    }

    setFilteredData(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      status: ''
    });
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

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return `${diffHours.toFixed(1)}h`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Check In', 'Check Out', 'Working Hours', 'Status'];
    const csvData = filteredData.map(record => [
      formatDate(record.check_in || record.timestamp),
      record.user_name || record.username || 'Unknown',
      formatTime(record.check_in),
      formatTime(record.check_out),
      calculateWorkingHours(record.check_in, record.check_out),
      record.check_out ? 'Complete' : 'In Progress'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout title="Attendance Records">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Attendance Records" currentPage="attendance">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filters */}
      <Card title="Filters" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <InputField
            id="search"
            label="Search User"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />

          {hasRole('admin') && (
            <SelectField
              id="userId"
              label="User"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              options={[
                { value: '', label: 'All Users' },
                ...users.map(user => ({
                  value: user.id.toString(),
                  label: user.full_name || user.username
                }))
              ]}
            />
          )}

          <InputField
            id="dateFrom"
            label="From Date"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />

          <InputField
            id="dateTo"
            label="To Date"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />

          <SelectField
            id="status"
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'complete', label: 'Complete' },
              { value: 'in_progress', label: 'In Progress' }
            ]}
          />

          <div className="flex items-end space-x-2">
            <Button
              onClick={clearFilters}
              variant="secondary"
              size="sm"
            >
              Clear
            </Button>
            <Button
              onClick={exportToCSV}
              variant="primary"
              size="sm"
              disabled={filteredData.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card title="Total Records">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">{filteredData.length}</div>
            <p className="text-sm text-gray-400">Attendance Records</p>
          </div>
        </Card>

        <Card title="Complete Sessions">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {filteredData.filter(record => record.check_out).length}
            </div>
            <p className="text-sm text-gray-400">With Check-out</p>
          </div>
        </Card>

        <Card title="In Progress">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {filteredData.filter(record => !record.check_out).length}
            </div>
            <p className="text-sm text-gray-400">Currently Active</p>
          </div>
        </Card>

        <Card title="Avg. Working Hours">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {(() => {
                const completeRecords = filteredData.filter(record => record.check_in && record.check_out);
                if (completeRecords.length === 0) return '0';
                
                const totalHours = completeRecords.reduce((sum, record) => {
                  const diffMs = new Date(record.check_out) - new Date(record.check_in);
                  return sum + (diffMs / (1000 * 60 * 60));
                }, 0);
                
                return (totalHours / completeRecords.length).toFixed(1);
              })()}h
            </div>
            <p className="text-sm text-gray-400">Average Duration</p>
          </div>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card title={`Attendance Records (${filteredData.length})`}>
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table headers={[
              'Date',
              ...(hasRole('admin') ? ['User'] : []),
              'Check In',
              'Check Out',
              'Working Hours',
              'Status'
            ]}>
              {filteredData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(record.check_in || record.timestamp)}</TableCell>
                  {hasRole('admin') && (
                    <TableCell>{record.user_name || record.username || 'Unknown'}</TableCell>
                  )}
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
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400">No attendance records found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or date range</p>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default AttendancePage;