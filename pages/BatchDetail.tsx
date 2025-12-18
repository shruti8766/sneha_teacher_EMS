import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Batch, Student, Teacher, ApiListResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useDetail } from '../context/DetailContext';
import { Loader2, Users, BookOpen, User, Award, ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const { setDetail, clearDetail } = useDetail();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'info'>('overview');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    board: '',
    standard: '',
    subject: '',
    description: '',
    maxStudents: '',
    teacherId: ''
  });

  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch batch details
        const batchesResponse = await api.get<ApiListResponse<Batch>>(`/batches?limit=1000`);
        const foundBatch = batchesResponse.items.find(b => b.id === id);
        
        if (!foundBatch) {
          throw new Error('Batch not found');
        }
        
        setBatch(foundBatch);
        setDetail(foundBatch.name, 'batch');
        setEditForm({
          name: foundBatch.name,
          board: foundBatch.board,
          standard: foundBatch.standard.toString(),
          subject: foundBatch.subject,
          description: foundBatch.description || '',
          maxStudents: foundBatch.maxStudents?.toString() || '',
          teacherId: foundBatch.teacherId || ''
        });

        // Fetch all students and filter by batch
        try {
          const studentsResponse = await api.get<ApiListResponse<Student>>(`/students?limit=1000`);
          const batchStudents = studentsResponse.items.filter(s => 
            foundBatch.studentIds?.includes(s.id)
          );
          setStudents(batchStudents);
        } catch (error) {
          setStudents([]);
        }

        // Fetch all teachers
        try {
          const teachersResponse = await api.get<ApiListResponse<Teacher>>(`/teachers?limit=1000`);
          setTeachers(teachersResponse.items);
        } catch (error) {
          setTeachers([]);
        }

      } catch (error: any) {
        showToast(error.message || 'Failed to load batch details', 'error');
        console.error('Failed to load batch details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();

    // Cleanup: Clear detail view when leaving this page
    return () => {
      clearDetail();
    };
  }, [id, showToast]);

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const teacherName = editForm.teacherId ? teachers.find(t => t.id === editForm.teacherId)?.name : undefined;
      const payload = {
        name: editForm.name,
        board: editForm.board,
        standard: parseInt(editForm.standard),
        subject: editForm.subject,
        description: editForm.description,
        maxStudents: editForm.maxStudents ? parseInt(editForm.maxStudents) : undefined,
        teacherId: editForm.teacherId || undefined,
        teacherName: teacherName
      };
      await api.put(`/batches/${id}`, payload);
      showToast('Batch updated successfully');
      setIsEditModalOpen(false);
      
      // Refresh batch data
      const batchesResponse = await api.get<ApiListResponse<Batch>>(`/batches?limit=1000`);
      const updatedBatch = batchesResponse.items.find(b => b.id === id);
      if (updatedBatch) {
        setBatch(updatedBatch);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!id || !batch) return;

    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/batches/${id}`);
      showToast('Batch deleted successfully', 'success');
      navigate('/batches');
    } catch (error: any) {
      console.error('Delete batch error:', error);
      
      if (error.message.includes('404') || error.message.includes('Cannot DELETE')) {
        showToast('Delete batch endpoint not available on server', 'error');
      } else if (error.message.includes('401')) {
        showToast('Unauthorized: Please login again', 'error');
      } else if (error.message.includes('403')) {
        showToast('Forbidden: You do not have permission to delete this batch', 'error');
      } else if (error.message.includes('500')) {
        showToast('Server error: Please try again later', 'error');
      } else {
        showToast(error.message || 'Failed to delete batch', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className={`text-center py-12 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
        <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Batch not found</p>
        <button
          onClick={() => navigate('/batches')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Batches
        </button>
      </div>
    );
  }

  // Get teacher info if available
  const batchTeacher = teachers.find(t => batch.subject && t.subjects?.includes(batch.subject));

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/batches')}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
          </button>
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{batch.name}</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Batch ID: {batch.id}</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
            >
              <Edit2 size={18} /> Edit Batch
            </button>
            <button
              onClick={handleDeleteBatch}
              className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition flex items-center gap-2 font-medium shadow-sm"
            >
              <Trash2 size={18} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className={`flex gap-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-orange-600 text-orange-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'students'
                  ? 'border-orange-600 text-orange-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'info'
                  ? 'border-orange-600 text-orange-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Details
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className={`rounded-xl shadow-sm border p-6 space-y-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-orange-900 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
                  <p className={`text-xs uppercase font-medium flex items-center gap-2 mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    <BookOpen size={16} /> Subject
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>{batch.subject}</p>
                </div>
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-xs uppercase font-medium mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {batch.board} • Standard {batch.standard}
                  </p>
                  <p className={`text-lg font-semibold ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>Board & Level</p>
                </div>
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs uppercase font-medium flex items-center gap-2 mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    <User size={16} /> Teacher
                  </p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                    {batch.teacherName || 'Not assigned'}
                  </p>
                </div>
              </div>

              {batch.description && (
                <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold uppercase mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Description</h3>
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{batch.description}</p>
                </div>
              )}

              <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <Users size={16} /> Capacity
                </h3>
                <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((students.length) / (batch.maxStudents || students.length + 1)) * 100,
                        100
                      )}%`
                    }}
                  />
                </div>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {students.length} / {batch.maxStudents || '∞'} students
                </p>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      <tr>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Email</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Board</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Standard</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {students.map(student => (
                        <tr
                          key={student.id}
                          onClick={() => navigate(`/students/${student.id}`)}
                          className={`cursor-pointer transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.name}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.email}</td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.board}</td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.standard}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              student.active
                                ? isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-700'
                                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'
                            }`}>
                              {student.active ? '✓ Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Users size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p>No students enrolled yet</p>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'info' && (
            <div className={`rounded-xl shadow-sm border p-6 space-y-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div>
                <h3 className={`text-sm font-semibold uppercase mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Batch Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.name}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Subject</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.subject}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Board</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.board}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Standard</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.standard}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max Students</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.maxStudents || '∞'}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Currently Enrolled</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{students.length}</p>
                  </div>
                </div>
              </div>

              {batch.description && (
                <div className={`border-t pt-6 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold uppercase mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Description</h3>
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{batch.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary Card */}
        <div className="lg:col-span-1">
          <div className={`rounded-xl shadow-sm border p-6 space-y-6 bg-gradient-to-br ${isDarkMode ? 'from-orange-900 to-orange-950 border-orange-700' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <div>
              <h3 className={`text-sm font-semibold uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-900'}`}>
                <Award size={16} /> Summary
              </h3>
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800 bg-opacity-40' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>Subject</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>{batch.subject}</p>
                </div>
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800 bg-opacity-40' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>Students Enrolled</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>{students.length}</p>
                </div>
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800 bg-opacity-40' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>Board & Standard</p>
                  <p className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                    {batch.board} Std {batch.standard}
                  </p>
                </div>
              </div>
            </div>

            {batchTeacher && (
              <div className={`border-t pt-4 ${isDarkMode ? 'border-orange-700' : 'border-orange-200'}`}>
                <h3 className={`text-sm font-semibold uppercase mb-3 flex items-center gap-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-900'}`}>
                  <User size={16} /> Teacher
                </h3>
                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800 bg-opacity-60' : 'bg-white bg-opacity-80'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {batchTeacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{batchTeacher.name}</p>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{batchTeacher.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Batch Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Batch">
        <form onSubmit={handleUpdateBatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Batch Name *</label>
              <input
                required
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject *</label>
              <input
                required
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.subject}
                onChange={e => setEditForm({...editForm, subject: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Board *</label>
              <input
                required
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.board}
                onChange={e => setEditForm({...editForm, board: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Standard *</label>
              <input
                required
                type="number"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.standard}
                onChange={e => setEditForm({...editForm, standard: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Max Students</label>
              <input
                type="number"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.maxStudents}
                onChange={e => setEditForm({...editForm, maxStudents: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <input
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.description}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assign Teacher</label>
            <select 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={editForm.teacherId}
              onChange={e => setEditForm({...editForm, teacherId: e.target.value})}
            >
              <option value="">No teacher assigned</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.subjects ? `(${teacher.subjects.join(', ')})` : ''}
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select a teacher for this batch</p>
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className={`px-4 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Updating...' : 'Update Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BatchDetail;
