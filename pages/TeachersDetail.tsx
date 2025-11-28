import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Teacher, Batch, ApiListResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Phone, BookOpen, Users, Edit2, ArrowLeft } from 'lucide-react';
import Modal from '../components/Modal';

const TeachersDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'batches'>('overview');

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
        setEditForm({
          name: foundTeacher.name,
          email: foundTeacher.email,
          phone: foundTeacher.phone || '',
          subjects: foundTeacher.subjects?.join(', ') || ''
        });

        // Fetch Batches taught by this teacher
        try {
          const batchesResponse = await api.get<ApiListResponse<Batch>>(`/batches?limit=1000`);
          // Filter batches that might be taught by this teacher
          // This depends on your API structure - adjust if needed
          setBatches(batchesResponse.items || []);
        } catch (error) {
          setBatches([]);
        }

      } catch (error: any) {
        showToast(error.message || 'Failed to load teacher details', 'error');
        console.error('Failed to load teacher details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherDetails();
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
        <p className="text-gray-600 mb-4">Teacher not found</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teachers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{teacher.name}</h1>
            <p className="text-gray-500">Teacher ID: {teacher.id}</p>
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
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'batches'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Batches
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Name</label>
                    <p className="text-lg font-medium text-gray-900 mt-1">{teacher.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium flex items-center gap-2">
                      <Mail size={14} /> Email
                    </label>
                    <p className="text-lg font-medium text-gray-900 mt-1">{teacher.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium flex items-center gap-2">
                      <Phone size={14} /> Phone
                    </label>
                    <p className="text-lg font-medium text-gray-900 mt-1">{teacher.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        teacher.active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {teacher.active ? '✓ Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4 flex items-center gap-2">
                  <BookOpen size={16} /> Subjects Taught
                </h3>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    teacher.subjects.map(subject => (
                      <span
                        key={subject}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                      >
                        {subject}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No subjects assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Batches Tab */}
          {activeTab === 'batches' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {batches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Batch Name</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Board</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Standard</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {batches.map(batch => (
                        <tr key={batch.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{batch.name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{batch.board}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{batch.standard}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                              {batch.subject}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
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
                <div className="p-8 text-center text-gray-500">
                  <BookOpen size={32} className="mx-auto mb-2 text-gray-400" />
                  <p>No batches assigned yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-green-900 uppercase mb-4 flex items-center gap-2">
                <BookOpen size={16} /> Summary
              </h3>
              <div className="space-y-4">
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <p className="text-xs text-green-700 uppercase font-medium">Subjects</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {teacher.subjects?.length || 0}
                  </p>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <p className="text-xs text-green-700 uppercase font-medium">Batches</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {batches.length}
                  </p>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <p className="text-xs text-green-700 uppercase font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {batches.reduce((sum, batch) => sum + (batch.studentIds?.length || 0), 0)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                required
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                value={editForm.email}
                onChange={e => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                value={editForm.phone}
                onChange={e => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                placeholder="Maths, Physics, Chemistry"
                value={editForm.subjects}
                onChange={e => setEditForm({...editForm, subjects: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
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
