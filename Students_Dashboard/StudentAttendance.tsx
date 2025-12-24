import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { Calendar, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  sessionId: string;
  subject?: string;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  useEffect(() => {
    loadAttendance();
  }, [user]);

  const loadAttendance = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, get the student document to find the document ID
      let studentDocId = user.uid;
      try {
        const studentResponse = await api.get<any>(`/students/${user.uid}`);
        if (studentResponse.ok && studentResponse.id) {
          studentDocId = studentResponse.id;
          console.log('Using student document ID for attendance:', studentDocId);
        }
      } catch (err) {
        console.log('Could not fetch student doc, using user.uid:', user.uid);
      }
      
      // NEW: Load daily attendance records for this student
      // This will show all dates with their attendance status
      try {
        const dailyResponse = await api.get<any>(`/attendance/daily/student/${studentDocId}`);
        console.log('✅ Daily Attendance Response:', dailyResponse);
        
        if (dailyResponse.ok && dailyResponse.items) {
          const records = dailyResponse.items || [];
          console.log(`📅 Loaded ${records.length} attendance records:`, records);
          
          // Sort by date (newest first)
          records.sort((a: AttendanceRecord, b: AttendanceRecord) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          setAttendanceRecords(records);

          // Calculate stats
          const total = records.length;
          const present = records.filter((r: AttendanceRecord) => r.status === 'present').length;
          const absent = records.filter((r: AttendanceRecord) => r.status === 'absent').length;
          const late = records.filter((r: AttendanceRecord) => r.status === 'late').length;
          const percentage = total > 0 ? ((present + late) / total) * 100 : 0;

          console.log(`📊 Stats: Total=${total}, Present=${present}, Absent=${absent}, Late=${late}, Percentage=${percentage.toFixed(1)}%`);

          setStats({
            total,
            present,
            absent,
            late,
            percentage
          });
          
          return; // Success with new endpoint
        }
      } catch (err) {
        console.warn('⚠️ New daily endpoint not available, falling back to old endpoint:', err);
      }
      
      // FALLBACK: Use old endpoint if new one doesn't exist yet
      const response = await api.get<any>(`/attendance/student/${studentDocId}`);
      console.log('Attendance Response (fallback):', response);
      
      // API returns items (records) and summary (stats)
      let records = response.items || [];
      
      // Convert old session-based records to date-based format
      // Old records have sessionId but no date field
      records = records.map((record: any) => ({
        ...record,
        date: record.date || record.markedAt?._seconds 
          ? new Date(record.markedAt._seconds * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10) // fallback to today
      }));
      
      console.log('📝 Converted old records to date-based format:', records);
      
      setAttendanceRecords(records);

      // Use summary from API if available, otherwise calculate manually
      if (response.summary) {
        console.log('Using API summary:', response.summary);
        setStats({
          total: response.summary.total || 0,
          present: response.summary.present || 0,
          absent: response.summary.absent || 0,
          late: response.summary.late || 0,
          percentage: response.summary.percentage || 0
        });
      } else {
        // Fallback: Calculate stats manually
        console.log('Calculating stats manually from records');
        const total = records.length;
        const present = records.filter((r: AttendanceRecord) => r.status === 'present').length;
        const absent = records.filter((r: AttendanceRecord) => r.status === 'absent').length;
        const late = records.filter((r: AttendanceRecord) => r.status === 'late').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        setStats({
          total,
          present,
          absent,
          late,
          percentage
        });
      }
    } catch (error: any) {
      console.error('Attendance error:', error);
      showToast(error.message || 'Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRecords = () => {
    if (filter === 'all') return attendanceRecords;
    return attendanceRecords.filter((r: AttendanceRecord) => r.status === filter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'text-green-300 bg-green-900' : 'text-green-700 bg-green-100'}`}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Present
          </span>
        );
      case 'absent':
        return (
          <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'text-red-300 bg-red-900' : 'text-red-700 bg-red-100'}`}>
            <XCircle className="w-4 h-4 mr-1" />
            Absent
          </span>
        );
      case 'late':
        return (
          <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'text-yellow-300 bg-yellow-900' : 'text-yellow-700 bg-yellow-100'}`}>
            <Clock className="w-4 h-4 mr-1" />
            Late
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today or yesterday
    const dateStr = date.toDateString();
    if (dateStr === today.toDateString()) {
      return '🟢 Today - ' + date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } else if (dateStr === yesterday.toDateString()) {
      return 'Yesterday - ' + date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const filteredRecords = getFilteredRecords();

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><Calendar size={40} className="text-yellow-600" />Attendance</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Track your attendance records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Days</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-gray-900'}`}>{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Present</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.present}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Absent</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{stats.absent}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Late</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.late}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Percentage</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{stats.percentage.toFixed(1)}%</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex gap-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {(['all', 'present', 'absent', 'late'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              filter === f
                ? isDarkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Attendance List */}
      {filteredRecords.length === 0 ? (
        <div className={`text-center py-12 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No attendance records</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {stats.total === 0 
              ? 'No attendance has been marked yet. Your teacher will mark attendance during class.' 
              : `You don't have any ${filter !== 'all' ? filter : ''} attendance records`}
          </p>
        </div>
      ) : (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Date</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Subject</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filteredRecords.map((record: AttendanceRecord, index: number) => {
                  const isToday = record.date === new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={index} className={`${isDarkMode ? isToday ? 'bg-green-900' : 'hover:bg-gray-700' : isToday ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : ''}`}>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isToday ? (isDarkMode ? 'text-green-300' : 'text-green-900') : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                            {formatDate(record.date)}
                          </span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{record.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {record.subject || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default StudentAttendance;
