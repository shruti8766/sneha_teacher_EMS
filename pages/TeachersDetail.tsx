import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Teacher, Batch, Student, ApiListResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useDetail } from '../context/DetailContext';
import { Loader2, Mail, Phone, BookOpen, Users, Edit2, ArrowLeft, GraduationCap } from 'lucide-react';
import Modal from '../components/Modal';
const TeachersDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { setDetail, clearDetail } = useDetail();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<(Student & { assignedSubjects: string[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'students'>('overview');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    subjects: ''
  });

  useEffect(() => {
    const fetchTeacherDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch teacher details
        const teachersResponse = await api.get<ApiListResponse<Teacher>>(`/teachers?limit=1000`);
        const foundTeacher = teachersResponse.items.find(t => t.id === id);
        
        if (!foundTeacher) {
          throw new Error('Teacher not found');
        }
        
        setTeacher(foundTeacher);
        setDetail(foundTeacher.name, 'teacher');
        setEditForm({
          name: foundTeacher.name,
          email: foundTeacher.email,
          phone: foundTeacher.phone || '',
          subjects: foundTeacher.subjects?.join(', ') || ''
        });

        // Fetch Batches taught by this teacher
        try {
          const batchesResponse = await api.get<ApiListResponse<Batch>>(`/batches?limit=1000`);
          // Filter batches where this teacher is assigned
          const teacherBatches = batchesResponse.items.filter(batch => batch.teacherId === id);
          setBatches(teacherBatches);
        } catch (error) {
          setBatches([]);
        }

        // Fetch Students assigned to this teacher
        try {
          const studentsResponse = await api.get<ApiListResponse<Student>>(`/students?limit=1000`);
          // Filter students that have this teacher assigned
          const assignedStudents = studentsResponse.items
            .map(student => {
              // Get assigned subjects from student's assignedTeachers array
              const assignment = (student as any).assignedTeachers?.find(
                (t: any) => t.teacherId === id
              );
              return {
                ...student,
                assignedSubjects: assignment?.subjects || []
              };
            })
            .filter(student => student.assignedSubjects.length > 0);
          setStudents(assignedStudents);
        } catch (error) {
          setStudents([]);
        }

      } catch (error: any) {
        showToast(error.message || 'Failed to load teacher details', 'error');
        console.error('Failed to load teacher details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherDetails();

    // Cleanup: Clear detail view when leaving this page
    return () => {
      clearDetail();
    };
  }, [id, showToast]);

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        subjects: editForm.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      console.log('Updating teacher with payload:', payload);
      const updateResponse = await api.put(`/teachers/${id}`, payload);
      console.log('Update response:', updateResponse);
      showToast('Teacher updated successfully');
      setIsEditModalOpen(false);
      
      // Refresh teacher data
      const teachersResponse = await api.get<ApiListResponse<Teacher>>(`/teachers?limit=1000`);
      const updatedTeacher = teachersResponse.items.find(t => t.id === id);
      console.log('Updated teacher from GET:', updatedTeacher);
      if (updatedTeacher) {
        setTeacher(updatedTeacher);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update teacher', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className={isDarkMode ? 'text-gray-400 mb-4' : 'text-gray-600 mb-4'}>Teacher not found</p>
        <button
          onClick={() => navigate('/teachers')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Teachers
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teachers')}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          </button>
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{teacher.name}</h1>
            <p className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>Teacher ID: {teacher.id}</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Edit2 size={18} /> Edit Teacher
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className={`flex gap-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'batches'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Batches
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'students'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Students ({students.length})
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className={`rounded-xl shadow-sm border p-6 space-y-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div>
                <h3 className={`text-sm font-semibold uppercase mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{teacher.name}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Mail size={14} /> Email
                    </label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{teacher.email}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Phone size={14} /> Phone
                    </label>
                    <p className={`text-lg font-medium mt-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{teacher.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        teacher.active ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-700') : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700')
                      }`}>
                        {teacher.active ? '✓ Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`border-t pt-6 ${isDarkMode ? 'border-gray-700' : ''}`}>
                <h3 className={`text-sm font-semibold uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <BookOpen size={16} /> Subjects Taught
                </h3>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    teacher.subjects.map(subject => (
                      <span
                        key={subject}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border ${isDarkMode ? 'bg-blue-900 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                      >
                        {subject}
                      </span>
                    ))
                  ) : (
                    <p className={isDarkMode ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>No subjects assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Batches Tab */}
          {activeTab === 'batches' && (
            <div className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              {batches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      <tr>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Batch Name</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Board</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Standard</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Subject</th>
                        <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Students</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {batches.map(batch => (
                        <tr key={batch.id} className={`transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{batch.name}</div>
                          </td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{batch.board}</td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{batch.standard}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                              {batch.subject}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Users size={14} />
                              {batch.studentIds?.length || 0} / {batch.maxStudents || '∞'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <BookOpen size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p>No batches assigned yet</p>
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className={`rounded-xl shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              {students.length > 0 ? (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold flex items-center gap-2 mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      <GraduationCap size={20} className="text-blue-600" />
                      Students Taught by {teacher?.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students assigned to this teacher for specific subjects</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map(student => (
                      <div
                        key={student.id}
                        className={`p-5 rounded-lg border transition-shadow cursor-pointer ${isDarkMode ? 'bg-blue-900 border-blue-700 hover:shadow-md' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md'}`}
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        <div className="space-y-3">
                          <div>
                            <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>{student.name}</h4>
                            <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{student.board} - Standard {student.standard}</p>
                          </div>
                          
                          <div className={`bg-opacity-50 p-3 rounded border ${isDarkMode ? 'bg-blue-800 border-blue-600' : 'bg-white border-blue-200'}`}>
                            <p className={`text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Subjects Taught</p>
                            <div className="flex flex-wrap gap-1">
                              {student.assignedSubjects.length > 0 ? (
                                student.assignedSubjects.map((subject, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-blue-700 text-blue-100' : 'bg-blue-600 text-white'}`}
                                  >
                                    {subject}
                                  </span>
                                ))
                              ) : (
                                <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>No subjects assigned</span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Email</p>
                              <p className={`font-medium break-all ${isDarkMode ? 'text-blue-100' : 'text-blue-900'}`}>{student.email}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Phone</p>
                              <p className={`font-medium ${isDarkMode ? 'text-blue-100' : 'text-blue-900'}`}>{student.phone || 'N/A'}</p>
                            </div>
                          </div>

                          <div className={`pt-2 border-t ${isDarkMode ? 'border-blue-700' : 'border-blue-200'}`}>
                            <button className={`w-full px-3 py-2 text-sm font-medium rounded transition ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <GraduationCap size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p>No students assigned yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className={`rounded-xl shadow-sm border p-6 space-y-6 ${isDarkMode ? 'bg-green-900 border-green-700' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
            <div>
              <h3 className={`text-sm font-semibold uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>
                <BookOpen size={16} /> Summary
              </h3>
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-green-800' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Subjects</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                    {teacher.subjects?.length || 0}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-green-800' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Batches Teaching</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                    {batches.length}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-green-800' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Students in Batches</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                    {batches.reduce((sum, batch) => sum + (batch.studentIds?.length || 0), 0)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-green-800' : 'bg-white bg-opacity-60'}`}>
                  <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Direct Assignments</p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                    {students.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Teacher Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Teacher">
        <form onSubmit={handleUpdateTeacher} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
              <input
                required
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
              <input
                required
                type="email"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.email}
                onChange={e => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <input
                type="tel"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={editForm.phone}
                onChange={e => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subjects (comma separated)</label>
              <input
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Maths, Physics, Chemistry"
                value={editForm.subjects}
                onChange={e => setEditForm({...editForm, subjects: e.target.value})}
              />
            </div>
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : ''}`}>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Updating...' : 'Update Teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeachersDetail;
