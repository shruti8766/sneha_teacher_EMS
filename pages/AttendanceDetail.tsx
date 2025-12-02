import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, AttendanceSession, Batch, Student, DailyAttendance } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Save } from 'lucide-react';

const AttendanceDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<{[studentId: string]: DailyAttendance}>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);

  // Load session, batch, and students
  useEffect(() => {
    loadSessionData();
    // eslint-disable-next-line
  }, [sessionId]);

  // Load attendance for selected date
  useEffect(() => {
    if (session && students.length > 0) {
      loadAttendanceForDate(selectedDate);
    }
    // eslint-disable-next-line
  }, [selectedDate, session, students]);

  // Auto-save for today's attendance every 30 seconds
  useEffect(() => {
    // Clear any existing interval
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    const today = new Date().toISOString().slice(0, 10);
    const isToday = selectedDate === today;

    if (isToday && hasChanges) {
      // Auto-save every 30 seconds for today's attendance
      const interval = setInterval(() => {
        console.log('Auto-saving attendance...');
        saveChanges(true); // true = silent save
      }, 30000); // 30 seconds

      setAutoSaveInterval(interval);

      // Cleanup on unmount or when dependencies change
      return () => clearInterval(interval);
    }

    return () => {
      if (autoSaveInterval) clearInterval(autoSaveInterval);
    };
  }, [hasChanges, selectedDate]);

  // Check if selected date is in the past
  const isPastDate = () => {
    const today = new Date().toISOString().slice(0, 10);
    return selectedDate < today;
  };

  // Check if editing is allowed
  const canEdit = () => {
    const today = new Date().toISOString().slice(0, 10);
    // Can edit if: it's today OR (it's past date AND edit mode is enabled)
    return selectedDate === today || (isPastDate() && isEditMode);
  };

  const loadSessionData = async () => {
    if (!sessionId) {
      console.error('No sessionId provided');
      return;
    }
    
    console.log('Loading session data for sessionId:', sessionId);
    setLoading(true);
    try {
      let sessionData: AttendanceSession | null = null;

      // Try to load session directly (backend endpoint has 500 error bug)
      try {
        const sessionRes = await api.get<any>(`/attendance/sessions/${sessionId}`);
        console.log('Loaded session directly:', sessionRes);
        
        // Backend wraps the session in a 'session' property
        sessionData = sessionRes.session || sessionRes;
        console.log('Extracted session data:', sessionData);
      } catch (err) {
        console.warn('Direct session endpoint failed, falling back to sessions list:', err);
        
        // Fallback: Load all sessions and find this one
        const sessionsRes = await api.get<ApiListResponse<AttendanceSession>>('/attendance/sessions?limit=100');
        console.log('All sessions:', sessionsRes.items);
        console.log('Looking for session with id:', sessionId);
        
        sessionData = sessionsRes.items.find(s => s.id === sessionId) || null;
        
        if (!sessionData) {
          console.error('Session not found in list. Available session IDs:', sessionsRes.items.map(s => s.id));
          throw new Error('Session not found');
        }
        console.log('Found session via fallback:', sessionData);
      }

      setSession(sessionData);

      // Load batch
      const batchId = sessionData.batchId || sessionData.batchIds?.[0];
      console.log('Session batchId:', sessionData.batchId, 'batchIds:', sessionData.batchIds, 'Using:', batchId);
      
      if (batchId) {
        const batchRes = await api.get<Batch>(`/batches/${batchId}`);
        console.log('Loaded batch:', batchRes);
        setBatch(batchRes);

        // Load students in batch
        if (batchRes.studentIds && batchRes.studentIds.length > 0) {
          console.log('Batch has studentIds:', batchRes.studentIds);
          const studentsRes = await api.get<ApiListResponse<Student>>('/students?limit=1000');
          const batchStudents = studentsRes.items.filter(s => 
            batchRes.studentIds.includes(s.id)
          );
          console.log('Filtered batch students:', batchStudents);
          setStudents(batchStudents);
        } else {
          console.warn('Batch has no studentIds');
        }
      } else {
        console.error('No batchId found in session data');
      }
    } catch (error) {
      showToast('Failed to load session data', 'error');
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceForDate = async (date: string) => {
    if (!sessionId || students.length === 0) return;

    try {
      // Try to fetch existing attendance for this date
      const response = await api.get<ApiListResponse<DailyAttendance>>(
        `/attendance/daily?sessionId=${sessionId}&date=${date}`
      );

      if (response.items && response.items.length > 0) {
        // Map existing attendance
        const map: {[studentId: string]: DailyAttendance} = {};
        response.items.forEach(record => {
          map[record.studentId] = record;
        });
        setAttendanceMap(map);
      } else {
        // No attendance for this date - auto-create present records
        await autoCreatePresentRecords(date);
      }
    } catch (error) {
      // If endpoint doesn't exist or fails, auto-create present records
      console.log('No existing attendance, creating default present records');
      await autoCreatePresentRecords(date);
    }
  };

  const autoCreatePresentRecords = async (date: string) => {
    if (!sessionId) return;

    // Create default "present" records for all students
    const defaultMap: {[studentId: string]: DailyAttendance} = {};
    
    students.forEach(student => {
      defaultMap[student.id] = {
        id: `${sessionId}_${student.id}_${date}`,
        sessionId: sessionId,
        date: date,
        studentId: student.id,
        status: 'present',
        markedAt: new Date().toISOString()
      };
    });

    setAttendanceMap(defaultMap);
    
    // Save to backend automatically
    try {
      const records = Object.values(defaultMap);
      await api.post('/attendance/daily/bulk', { records });
      console.log(`Auto-created ${records.length} present records for ${date}`);
    } catch (error) {
      console.error('Failed to auto-create attendance:', error);
      // Still show the UI even if save fails
    }
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!sessionId) return;
    
    // Check if editing is allowed
    if (!canEdit()) {
      showToast('Please click "Edit" to modify past attendance', 'error');
      return;
    }

    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        id: prev[studentId]?.id || `${sessionId}_${studentId}_${selectedDate}`,
        sessionId: sessionId,
        date: selectedDate,
        studentId: studentId,
        status: status,
        markedAt: prev[studentId]?.markedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }));

    setHasChanges(true);
  };

  const saveChanges = async (silent = false) => {
    if (!hasChanges || !sessionId) return;

    setSaving(true);
    try {
      const records = Object.values(attendanceMap);
      await api.post('/attendance/daily/bulk', { records });
      
      if (!silent) {
        showToast('Attendance saved successfully', 'success');
      }
      setHasChanges(false);
      
      // If it's a past date, exit edit mode after saving
      if (isPastDate()) {
        setIsEditMode(false);
      }
    } catch (error) {
      if (!silent) {
        showToast('Failed to save attendance', 'error');
      }
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50';
      case 'absent':
        return 'text-red-600 bg-red-50';
      case 'late':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5" />;
      case 'absent':
        return <XCircle className="w-5 h-5" />;
      case 'late':
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const presentCount = Object.values(attendanceMap).filter((a: DailyAttendance) => a.status === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((a: DailyAttendance) => a.status === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter((a: DailyAttendance) => a.status === 'late').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!session || !batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Session or batch not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Sessions
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{batch.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Subject:</span> {session.subject}
            </div>
            <div>
              <span className="font-medium">Board:</span> {batch.board}
            </div>
            <div>
              <span className="font-medium">Standard:</span> {batch.standard}
            </div>
          </div>
          {session.topic && (
            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium">Topic:</span> {session.topic}
            </div>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setHasChanges(false);
                  setIsEditMode(false);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* Past Date Indicator & Edit Button */}
            {isPastDate() && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Past Date
                </span>
                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setHasChanges(false);
                      loadAttendanceForDate(selectedDate); // Reload to discard changes
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            )}
            
            {/* Today Indicator */}
            {selectedDate === new Date().toISOString().slice(0, 10) && (
              <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full font-medium">
                Today - Auto-saves every 30s
              </span>
            )}
          </div>

          {/* Summary Stats */}
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <div className="text-sm text-gray-600">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <div className="text-sm text-gray-600">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
              <div className="text-sm text-gray-600">Late</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Students ({students.length})
          </h2>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students in this batch
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {students.map(student => {
              const attendance = attendanceMap[student.id];
              const status = attendance?.status || 'present';

              return (
                <div key={student.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateAttendanceStatus(student.id, 'present')}
                        disabled={!canEdit()}
                        className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                          status === 'present'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 text-gray-600 hover:border-green-300'
                        } ${!canEdit() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Present
                      </button>

                      <button
                        onClick={() => updateAttendanceStatus(student.id, 'late')}
                        disabled={!canEdit()}
                        className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                          status === 'late'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-gray-300 text-gray-600 hover:border-yellow-300'
                        } ${!canEdit() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Late
                      </button>

                      <button
                        onClick={() => updateAttendanceStatus(student.id, 'absent')}
                        disabled={!canEdit()}
                        className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                          status === 'absent'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 text-gray-600 hover:border-red-300'
                        } ${!canEdit() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Absent
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDetail;
