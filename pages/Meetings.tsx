import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, Meeting, Student, MeetingType } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, Plus, Calendar, Users, MapPin, Edit2, Trash2, Clock } from 'lucide-react';
import Modal from '../components/Modal';

const Meetings: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  // Memoized filtered students for search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(studentSearch.trim().toLowerCase())
    );
  }, [students, studentSearch]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'all_parents' as MeetingType,
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    description: '',
    location: '',
    status: 'scheduled' as const,
    otherInfo: '',
  });

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canManageMeetings = isAdmin;

  useEffect(() => {
    if (isAdmin || isTeacher) {
      loadData();
    }
  }, [isAdmin, isTeacher]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingsRes, studentsRes, batchesRes] = await Promise.all([
        api.get<ApiListResponse<Meeting>>('/meetings'),
        api.get<ApiListResponse<Student>>('/students'),
        api.get<ApiListResponse<any>>('/batches'),
      ]);

      if (meetingsRes.ok && meetingsRes.items) {
        setMeetings(meetingsRes.items);
      }

      if (studentsRes.ok && studentsRes.items) {
        setStudents(studentsRes.items);
      }

      if (batchesRes.ok && batchesRes.items) {
        setBatches(batchesRes.items);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      showToast(errorMessage, 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeeting = () => {
    setEditingMeeting(null);
    setSelectedParents([]);
    setSelectedStudents([]);
    setFormData({
      title: '',
      type: 'all_parents',
      date: '',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      status: 'scheduled',
    });
    setIsModalOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setSelectedParents(meeting.parentIds || []);
    setSelectedStudents(meeting.studentIds || []);
    setFormData({
      title: meeting.title,
      type: meeting.type,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      description: meeting.description || '',
      location: meeting.location || '',
      status: meeting.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (formData.type === 'specific_parent' && selectedParents.length === 0) {
      showToast('Please select at least one parent for specific parent meetings', 'error');
      return;
    }

    if (formData.type === 'other' && !formData.otherInfo?.trim()) {
      showToast('Please enter meeting details for other type meetings', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const meetingData = {
        ...formData,
        parentIds: formData.type === 'specific_parent' ? selectedParents : undefined,
        studentIds: formData.type === 'specific_parent' ? selectedStudents : undefined,
      };

      if (editingMeeting) {
        await api.put(`/meetings/${editingMeeting.id}`, meetingData);
        showToast('Meeting updated successfully', 'success');
      } else {
        await api.post('/meetings', meetingData);
        showToast('Meeting created successfully', 'success');
      }

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save meeting';
      showToast(errorMessage, 'error');
      console.error('Error saving meeting:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      setSubmitting(true);
      await api.delete(`/meetings/${meetingId}`);
      showToast('Meeting deleted successfully', 'success');
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete meeting';
      showToast(errorMessage, 'error');
      console.error('Error deleting meeting:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (meeting: Meeting) => {
    navigate(`/meetings/${meeting.id}`, { state: { meeting } });
  };

  const getParentEmails = (parentIds: string[] | undefined) => {
    if (!parentIds || parentIds.length === 0) return 'All Parents';
    return parentIds
      .map((id) => {
        const student = students.find((s) => s.id === id);
        return student?.parentEmail || 'Unknown';
      })
      .join(', ');
  };

  const toggleParentSelection = (studentId: string) => {
    setSelectedParents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  if (!isAdmin && !isTeacher) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          You don't have permission to access this page
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Loader2 className="animate-spin w-8 h-8 text-purple-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 min-h-screen px-4 md:px-6 py-4 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Calendar size={28} className="text-purple-600" />
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Meetings
            </h1>
          </div>
          {canManageMeetings && (
            <button
              onClick={handleAddMeeting}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              <Plus size={18} />
              Schedule Meeting
            </button>
          )}
        </div>

        {/* Meetings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.length === 0 ? (
            <div
              className={`col-span-full p-8 text-center rounded-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                No meetings scheduled yet. Create one to get started!
              </p>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => handleViewDetails(meeting)}
                className={`rounded-lg p-4 transition-all cursor-pointer ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700 hover:shadow-lg' : 'bg-white hover:shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {meeting.title}
                    </h3>
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        meeting.type === 'all_parents'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {meeting.type === 'all_parents' ? 'All Parents' : 'Specific Parent'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      meeting.status === 'completed'
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        : meeting.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {meeting.status}
                  </span>
                </div>

                <div className={`space-y-1.5 mb-3 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(meeting.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>
                      {meeting.startTime} - {meeting.endTime}
                    </span>
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      <span>{meeting.location}</span>
                    </div>
                  )}
                  {meeting.type === 'specific_parent' && (
                    <div className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{meeting.parentIds?.length || 0} parents</span>
                    </div>
                  )}
                </div>

                {meeting.description && (
                  <p className={`mb-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {meeting.description}
                  </p>
                )}

                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {canManageMeetings && (
                    <>
                      <button
                        onClick={() => handleEditMeeting(meeting)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDarkMode
                            ? 'bg-blue-900 hover:bg-blue-800 text-blue-200'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                        }`}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDarkMode
                            ? 'bg-red-900 hover:bg-red-800 text-red-200'
                            : 'bg-red-100 hover:bg-red-200 text-red-800'
                        }`}
                        disabled={submitting}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Meeting" isDarkMode={isDarkMode}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="e.g., Parent-Teacher Conference"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Meeting Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => {
                  setFormData({ ...formData, type: e.target.value as MeetingType, otherInfo: '' });
                  setSelectedParents([]);
                  setSelectedStudents([]);
                }}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="all_parents">All Parents</option>
                <option value="specific_parent">Specific Parent(s)</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'scheduled' | 'ongoing' | 'completed' | 'cancelled' })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                End Time *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="e.g., Room 101, Video Call"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="Meeting agenda and details"
              rows={3}
            />
          </div>

          {formData.type === 'specific_parent' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Parents/Students *
              </label>
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search student by name..."
                className={`w-full mb-2 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              <div
                className={`max-h-48 overflow-y-auto rounded-lg border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                {filteredStudents.length === 0 ? (
                  <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No students found</div>
                ) : (
                  filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 px-4 py-2 border-b ${
                        isDarkMode
                          ? 'border-gray-600 hover:bg-gray-600'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParents.includes(student.id)}
                        onChange={() => toggleParentSelection(student.id)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {student.parent?.name || student.parentName || 'Unknown Parent'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {student.name} (Student)
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {formData.type === 'other' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Details *
              </label>
              <textarea
                value={formData.otherInfo || ''}
                onChange={(e) => setFormData({ ...formData, otherInfo: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="Enter meeting details, participants, or any other information"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Saving...' : editingMeeting ? 'Update Meeting' : 'Schedule Meeting'}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Meeting Details Page - Removed Modal */}
    </div>
  );
};

export default Meetings;
