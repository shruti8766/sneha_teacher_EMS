
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, AttendanceSession, Batch, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, UserIcon, Edit2, Trash2, List, CalendarCheck } from 'lucide-react';
import Modal from '../components/Modal';

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Create Session State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [createForm, setCreateForm] = useState({
    batchIds: [] as string[],
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    startTime: '09:00',
    endTime: '10:00',
    topic: ''
  });

  // Mark Attendance State
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [studentsInBatch, setStudentsInBatch] = useState<Student[]>([]);
  const [markLoading, setMarkLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{[studentId: string]: 'present' | 'absent' | 'late'}>({});
  const [sessionsWithAttendance, setSessionsWithAttendance] = useState<Set<string>>(new Set());
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, batchesRes] = await Promise.all([
        api.get<ApiListResponse<AttendanceSession>>('/attendance/sessions?limit=50'),
        api.get<ApiListResponse<Batch>>('/batches?limit=100')
      ]);
      const loadedSessions = sessionsRes.items || [];
      const loadedBatches = batchesRes.items || [];
      setSessions(loadedSessions);
      setBatches(loadedBatches);
      
      // Check which sessions have attendance marked
      await checkSessionsForAttendance(loadedSessions, loadedBatches);
    } catch (error) {
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkSessionsForAttendance = async (sessionsToCheck: AttendanceSession[], batchList: Batch[]) => {
    const sessionsWithRecords = new Set<string>();
    
    // Check each session for existing attendance records
    for (const session of sessionsToCheck) {
      try {
        // Try bulk endpoint first
        try {
          const response = await api.get<any>(`/attendance/sessions/${session.id}`);
          if (response.ok && response.records && response.records.length > 0) {
            sessionsWithRecords.add(session.id);
            continue;
          }
        } catch (bulkError) {
          // Bulk endpoint not available, try fallback
        }
        
        // Fallback: Get batch and check first student
        const batch = batchList.find(b => b.id === session.batchId);
        if (batch && batch.studentIds && batch.studentIds.length > 0) {
          const firstStudentId = batch.studentIds[0];
          const response = await api.get<any>(`/attendance/student/${firstStudentId}`);
          if (response.items && response.items.length > 0) {
            const hasRecord = response.items.some((r: any) => r.sessionId === session.id);
            if (hasRecord) {
              sessionsWithRecords.add(session.id);
            }
          }
        }
      } catch (error) {
        // Silently fail - session might not have attendance yet
        console.log(`Could not check attendance for session ${session.id}`);
      }
    }
    
    setSessionsWithAttendance(sessionsWithRecords);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If editing existing session
    if (editingSession) {
      try {
        await api.put(`/attendance/sessions/${editingSession.id}`, {
          date: createForm.date,
          subject: createForm.subject,
          startTime: createForm.startTime,
          endTime: createForm.endTime,
          topic: createForm.topic
        });
        showToast('Session updated successfully');
        setIsCreateModalOpen(false);
        setEditingSession(null);
        setCreateForm({
          batchIds: [],
          date: new Date().toISOString().slice(0, 10),
          subject: '',
          startTime: '09:00',
          endTime: '10:00',
          topic: ''
        });
        loadData();
      } catch (error: any) {
        showToast(error.message || 'Failed to update session', 'error');
      }
      return;
    }
    
    // Creating new session(s)
    if (createForm.batchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }
    
    try {
      // Create session for each selected batch
      await Promise.all(createForm.batchIds.map(batchId =>
        api.post('/attendance/sessions', {
          batchId,
          date: createForm.date,
          subject: createForm.subject,
          startTime: createForm.startTime,
          endTime: createForm.endTime,
          topic: createForm.topic
        })
      ));
      showToast('Attendance session(s) created successfully');
      setIsCreateModalOpen(false);
      setCreateForm({
        batchIds: [],
        date: new Date().toISOString().slice(0, 10),
        subject: '',
        startTime: '09:00',
        endTime: '10:00',
        topic: ''
      });
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to create session', 'error');
    }
  };

  const toggleBatch = (batchId: string) => {
    setCreateForm(prev => ({
      ...prev,
      batchIds: prev.batchIds.includes(batchId)
        ? prev.batchIds.filter(id => id !== batchId)
        : [...prev.batchIds, batchId]
    }));
  };

  const handleEditSession = (session: AttendanceSession) => {
    setEditingSession(session);
    setCreateForm({
      batchIds: [session.batchId],
      date: session.date,
      subject: session.subject,
      startTime: session.startTime || '09:00',
      endTime: session.endTime || '10:00',
      topic: session.topic || ''
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteSession = async (session: AttendanceSession) => {
    if (!window.confirm(`Are you sure you want to delete this session?\n\nBatch: ${getBatchName(session.batchId)}\nSubject: ${session.subject}\nDate: ${new Date(session.date).toLocaleDateString()}`)) {
      return;
    }
    
    try {
      await api.delete(`/attendance/sessions/${session.id}`);
      showToast('Session deleted successfully');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete session', 'error');
    }
  };

  const openMarkModal = async (session: AttendanceSession, viewOnly: boolean = false) => {
    setSelectedSession(session);
    setIsMarkModalOpen(true);
    setStudentsInBatch([]);
    setAttendanceData({});
    setHasExistingAttendance(false);
    setIsViewMode(viewOnly);
    
    // Load students for this batch
    try {
      const batch = batches.find(b => b.id === session.batchId);
      if (batch && batch.studentIds && batch.studentIds.length > 0) {
        const studentsRes = await api.get<ApiListResponse<Student>>('/students?limit=1000');
        const filtered = studentsRes.items.filter(s => batch.studentIds.includes(s.id));
        setStudentsInBatch(filtered);
        
        // If viewing or editing, load actual attendance records from backend
        if (viewOnly || sessionsWithAttendance.has(session.id)) {
          console.log('Loading attendance records for session:', session.id);
          const attendanceMap: {[studentId: string]: 'present' | 'absent' | 'late'} = {};
          let recordsFound = 0;
          
          // Try new efficient endpoint first
          try {
            const response = await api.get<any>(`/attendance/sessions/${session.id}`);
            console.log('Attendance response (bulk):', response);
            
            if (response.ok && response.records && response.records.length > 0) {
              response.records.forEach((record: any) => {
                attendanceMap[record.studentId] = record.status;
                recordsFound++;
              });
              
              setAttendanceData(attendanceMap);
              setHasExistingAttendance(true);
              console.log(`Loaded ${recordsFound} attendance records (bulk endpoint)`);
              return;
            }
          } catch (error: any) {
            console.log('Bulk endpoint not available, falling back to individual queries:', error.message);
          }
          
          // Fallback: Query each student individually
          for (const student of filtered) {
            try {
              const response = await api.get<any>(`/attendance/student/${student.id}`);
              console.log(`Attendance for ${student.name}:`, response);
              
              // Find ALL records matching this session
              if (response.items && response.items.length > 0) {
                const matchingRecords = response.items.filter((r: any) => r.sessionId === session.id);
                
                if (matchingRecords.length > 0) {
                  // If multiple records exist, use the most recent one (by markedAt timestamp)
                  const latestRecord = matchingRecords.reduce((latest: any, current: any) => {
                    const latestSeconds = latest.markedAt?.seconds || latest.markedAt?._seconds || 0;
                    const latestNanos = latest.markedAt?.nanoseconds || latest.markedAt?._nanoseconds || 0;
                    const currentSeconds = current.markedAt?.seconds || current.markedAt?._seconds || 0;
                    const currentNanos = current.markedAt?.nanoseconds || current.markedAt?._nanoseconds || 0;
                    
                    // Compare seconds first, then nanoseconds if seconds are equal
                    if (currentSeconds > latestSeconds) return current;
                    if (currentSeconds === latestSeconds && currentNanos > latestNanos) return current;
                    return latest;
                  });
                  
                  console.log(`✓ Found ${matchingRecords.length} attendance record(s) for ${student.name}:`, matchingRecords);
                  console.log(`Using latest for ${student.name}:`, {
                    studentId: latestRecord.studentId,
                    status: latestRecord.status,
                    sessionId: latestRecord.sessionId,
                    markedAt: latestRecord.markedAt,
                    id: latestRecord.id
                  });
                  
                  if (matchingRecords.length > 1) {
                    console.warn(`⚠️ Multiple (${matchingRecords.length}) attendance records found for ${student.name} in session ${session.id}. Backend should use upsert!`);
                  }
                  
                  attendanceMap[student.id] = latestRecord.status;
                  recordsFound++;
                } else {
                  console.log(`✗ No matching record for ${student.name} in session ${session.id}`);
                }
              }
            } catch (error) {
              console.error(`Failed to load attendance for student ${student.id}:`, error);
            }
          }
          
          console.log('Final attendance map:', attendanceMap);
          
          if (recordsFound > 0) {
            setAttendanceData(attendanceMap);
            setHasExistingAttendance(true);
            console.log(`Loaded ${recordsFound} attendance records (fallback method)`);
          } else {
            if (viewOnly) {
              showToast('No attendance records found for this session', 'error');
              setIsMarkModalOpen(false);
              return;
            }
            // Initialize with defaults for marking
            const initialAttendance: {[key: string]: 'present' | 'absent' | 'late'} = {};
            filtered.forEach(student => {
              initialAttendance[student.id] = 'present';
            });
            setAttendanceData(initialAttendance);
            setHasExistingAttendance(false);
          }
          return;
        }
        
        // Initialize attendance data with all students as 'present' by default (for new marking)
        const initialAttendance: {[key: string]: 'present' | 'absent' | 'late'} = {};
        filtered.forEach(student => {
          initialAttendance[student.id] = 'present';
        });
        setAttendanceData(initialAttendance);
      }
    } catch (error) {
      console.error("Error loading students for batch", error);
    }
  };

  const handleBulkMarkAttendance = async () => {
    if (!selectedSession) return;
    setMarkLoading(true);
    try {
      console.log('Marking attendance for session:', selectedSession.id);
      console.log('Attendance data:', attendanceData);
      
      // Convert attendance data to records array
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status
      }));
      
      console.log('Sending records:', records);
      
      // TEMPORARY: Bulk format - backend needs to be fixed to accept this
      const response = await api.post('/attendance/mark', {
        sessionId: selectedSession.id,
        records
      });
      
      console.log('API Response:', response);
      console.log('Attendance marked successfully');
      showToast(hasExistingAttendance ? 'Attendance updated successfully' : 'Attendance marked successfully for all students');
      
      // Mark this session as having attendance
      if (selectedSession) {
        setSessionsWithAttendance(prev => new Set(prev).add(selectedSession.id));
      }
      
      setIsMarkModalOpen(false);
      setAttendanceData({});
      loadData(); // Reload sessions to update UI
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      showToast(error.message || 'Failed to mark attendance', 'error');
    } finally {
      setMarkLoading(false);
    }
  };

  const updateStudentAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const student = studentsInBatch.find(s => s.id === studentId);
    const studentName = student?.name || 'Student';
    
    console.log(`📝 Updating attendance: ${studentName} (${studentId}) → ${status.toUpperCase()}`);
    
    setAttendanceData(prev => {
      const updated = {
        ...prev,
        [studentId]: status
      };
      console.log('✓ Updated attendance data:', updated);
      return updated;
    });
  };

  const markAllAs = (status: 'present' | 'absent' | 'late') => {
    const newData: {[key: string]: 'present' | 'absent' | 'late'} = {};
    studentsInBatch.forEach(student => {
      newData[student.id] = status;
    });
    setAttendanceData(newData);
  };

  const getBatchName = (id: string) => {
    const b = batches.find(batch => batch.id === id);
    return b ? b.name : id;
  };

  return (
    <div className={`space-y-4 min-h-screen px-3 md:px-6 py-4 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <CalendarCheck className="text-yellow-600" size={28} />
          Attendance
        </h1>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 font-medium shadow-sm text-sm"
          >
            <Plus size={18} /> Create Session
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : sessions.length === 0 ? (
        <div className={`text-center p-8 rounded-xl border ${isDarkMode ? 'text-gray-400 bg-gray-800 border-gray-700' : 'text-gray-500 bg-white border-gray-100'}`}>No attendance sessions found.</div>
      ) : (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <table className="w-full text-left">
            <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <tr>
                <th className={`px-4 py-2.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
                <th className={`px-4 py-2.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Batch</th>
                <th className={`px-4 py-2.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Subject</th>
                <th className={`px-4 py-2.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Time</th>
                <th className={`px-4 py-2.5 text-xs font-semibold uppercase text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {sessions.map(session => (
                <tr key={session.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        <Calendar size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                      <span className={`text-xs ml-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Session for all dates</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                      {getBatchName(session.batchId)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{session.subject}</td>
                  <td className={`px-4 py-3 text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <Clock size={12} /> {session.startTime} - {session.endTime}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(user?.role === 'admin' || user?.role === 'teacher') && (
                        <>
                          <button
                            onClick={() => navigate(`/attendance/${session.id}`)}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs font-medium"
                            title="Manage Daily Attendance"
                          >
                            <List size={12} />
                            Manage
                          </button>
                          <button
                            onClick={() => handleEditSession(session)}
                            className="text-indigo-600 hover:text-indigo-800 transition"
                            title="Edit Session"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Delete Session"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Session Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => {
        setIsCreateModalOpen(false);
        setEditingSession(null);
        setCreateForm({
          batchIds: [],
          date: new Date().toISOString().slice(0, 10),
          subject: '',
          startTime: '09:00',
          endTime: '10:00',
          topic: ''
        });
      }} title={editingSession ? "Edit Attendance Session" : "Create Attendance Session"} isDarkMode={isDarkMode}>
        <form onSubmit={handleCreateSession} className="space-y-4">
          {!editingSession && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Batches * <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({createForm.batchIds.length} selected)</span>
              </label>
              {batches.length > 0 ? (
                <div className={`max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2 ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300'}`}>
                  {batches.map(batch => (
                    <label key={batch.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={createForm.batchIds.includes(batch.id)}
                        onChange={() => toggleBatch(batch.id)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{batch.name}</p>
                        <p className="text-xs text-gray-500">{batch.subject} • Std {batch.standard}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">No batches available. Please create a batch first.</p>
              )}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject *</label>
            <input required type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={createForm.subject} onChange={e => setCreateForm({...createForm, subject: e.target.value})} placeholder="e.g. Mathematics" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={createForm.topic} onChange={e => setCreateForm({...createForm, topic: e.target.value})} placeholder="e.g. Quadratic Equations" />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date *</label>
            <input required type="date" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={createForm.date} onChange={e => setCreateForm({...createForm, date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Start Time *</label>
              <input required type="time" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={createForm.startTime} onChange={e => setCreateForm({...createForm, startTime: e.target.value})} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>End Time *</label>
              <input required type="time" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={createForm.endTime} onChange={e => setCreateForm({...createForm, endTime: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => {
              setIsCreateModalOpen(false);
              setEditingSession(null);
              setCreateForm({
                batchIds: [],
                date: new Date().toISOString().slice(0, 10),
                subject: '',
                startTime: '09:00',
                endTime: '10:00',
                topic: ''
              });
            }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={!editingSession && createForm.batchIds.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {editingSession ? 'Update Session' : `Create Session${createForm.batchIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark Attendance Modal */}
      <Modal isOpen={isMarkModalOpen} onClose={() => setIsMarkModalOpen(false)} title={`${isViewMode ? 'View' : hasExistingAttendance ? 'Edit' : 'Mark'} Attendance - ${selectedSession?.subject || ''}`}>
        <div className="space-y-4">
          {/* Session Info */}
          <div className="bg-indigo-50 p-3 rounded-lg text-sm border border-indigo-200">
            <p className="text-gray-700">
              <span className="font-medium">Batch:</span> {selectedSession && getBatchName(selectedSession.batchId)} | 
              <span className="font-medium ml-2">Date:</span> {selectedSession && new Date(selectedSession.date).toLocaleDateString()}
            </p>
            {selectedSession?.topic && <p className="text-gray-700 mt-1"><span className="font-medium">Topic:</span> {selectedSession.topic}</p>}
            <p className="text-gray-700 mt-1">
              <span className="font-medium">Time:</span> {selectedSession?.startTime || 'N/A'} - {selectedSession?.endTime || 'N/A'}
            </p>
          </div>

          {/* Quick Actions */}
          {!isViewMode && (
            <div className="flex gap-2 pb-3 border-b">
              <button type="button" onClick={() => markAllAs('present')} className="flex-1 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition text-sm font-medium">
                <CheckCircle className="inline mr-1 w-4 h-4" /> Mark All Present
              </button>
              <button type="button" onClick={() => markAllAs('absent')} className="flex-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                <XCircle className="inline mr-1 w-4 h-4" /> Mark All Absent
              </button>
              <button type="button" onClick={() => markAllAs('late')} className="flex-1 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition text-sm font-medium">
                <AlertCircle className="inline mr-1 w-4 h-4" /> Mark All Late
              </button>
            </div>
          )}

          {/* Students List */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Students ({studentsInBatch.length})
            </p>
            {studentsInBatch.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {studentsInBatch.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isViewMode ? (
                        // View mode - show status as badge
                        <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          attendanceData[student.id] === 'present'
                            ? 'bg-green-100 text-green-800'
                            : attendanceData[student.id] === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {attendanceData[student.id] === 'present' && <CheckCircle className="inline w-4 h-4 mr-1" />}
                          {attendanceData[student.id] === 'absent' && <XCircle className="inline w-4 h-4 mr-1" />}
                          {attendanceData[student.id] === 'late' && <AlertCircle className="inline w-4 h-4 mr-1" />}
                          {attendanceData[student.id]?.toUpperCase()}
                        </span>
                      ) : (
                        // Edit mode - show clickable buttons
                        <>
                          <button
                            type="button"
                            onClick={() => updateStudentAttendance(student.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              attendanceData[student.id] === 'present'
                                ? 'bg-green-600 text-white'
                                : isDarkMode ? 'bg-gray-700 text-green-400 border border-green-700 hover:bg-gray-600' : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentAttendance(student.id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              attendanceData[student.id] === 'absent'
                                ? 'bg-red-600 text-white'
                                : isDarkMode ? 'bg-gray-700 text-red-400 border border-red-700 hover:bg-gray-600' : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentAttendance(student.id, 'late')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              attendanceData[student.id] === 'late'
                                ? 'bg-yellow-600 text-white'
                                : isDarkMode ? 'bg-gray-700 text-yellow-400 border border-yellow-700 hover:bg-gray-600' : 'bg-white text-yellow-600 border border-yellow-300 hover:bg-yellow-50'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">No students found in this batch.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsMarkModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button 
                type="button" 
                onClick={handleBulkMarkAttendance} 
                disabled={studentsInBatch.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {hasExistingAttendance ? 'Update Attendance' : 'Save Attendance for All'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Attendance;
