
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, Teacher } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    subjects: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiListResponse<Teacher>>('/teachers?limit=100');
      console.log('All teachers from API:', response.items);
      // Filter out inactive/deleted teachers - treat undefined/missing active field as true
      const activeTeachers = response.items.filter(t => t.active !== false);
      console.log('Filtered active teachers:', activeTeachers);
      setTeachers(activeTeachers);
    } catch (error) {
      showToast('Failed to load teachers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line
  }, []);

  const handleDeleteTeacher = async (teacherId: string, teacherName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Attempting to delete teacher:', teacherId);
      const response = await api.delete(`/teachers/${teacherId}`);
      console.log('Delete response:', response);
      console.log('Response status/ok:', response?.ok);
      
      // Remove from local state
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      showToast('Teacher deleted successfully', 'success');
      
    } catch (error: any) {
      console.error('Delete teacher error:', error);
      
      if (error.message.includes('404')) {
        showToast('Teacher not found or delete endpoint not available', 'error');
      } else if (error.message.includes('Cannot DELETE')) {
        showToast('Delete endpoint not implemented on server', 'error');
      } else if (error.message.includes('401')) {
        showToast('Unauthorized: Please login again', 'error');
      } else if (error.message.includes('403')) {
        showToast('Forbidden: You do not have permission to delete this teacher', 'error');
      } else if (error.message.includes('500')) {
        showToast('Server error: Please try again later', 'error');
      } else {
        showToast(error.message || 'Failed to delete teacher', 'error');
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.post('/teachers', payload);
      showToast('Teacher created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', phone: '', subjects: '' });
      loadTeachers();
    } catch (error: any) {
      showToast(error.message || 'Failed to create teacher', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Teachers</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Add Teacher
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map(teacher => (
                <tr
                  key={teacher.id}
                  onClick={() => navigate(`/teachers/${teacher.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-xs text-gray-500">ID: {teacher.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects?.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2"><Mail size={14}/> {teacher.email}</div>
                      {teacher.phone && <div className="flex items-center gap-2"><Phone size={14}/> {teacher.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => handleDeleteTeacher(teacher.id, teacher.name, e)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition flex items-center gap-1"
                        title="Delete teacher"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Teacher">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input required type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="Min 8 chars" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="Maths, Physics" value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
              {submitting ? 'Creating...' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Teachers;
