
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Filter, Search, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ board: '', standard: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    board: '',
    standard: '',
    phone: '',
    subjects: '',
    schoolName: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentProfession: '',
    parentCompanyName: '',
    parentDesignation: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      let query = '/students?limit=100';
      if (filters.board) query += `&board=${filters.board}`;
      if (filters.standard) query += `&standard=${filters.standard}`;
      
      console.log('Loading students with query:', query);
      const response = await api.get<ApiListResponse<Student>>(query);
      console.log('Students loaded:', response.items.length, 'students');
      console.log('Students data:', response.items);
      setStudents(response.items);
    } catch (error) {
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line
  }, [filters]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.delete(`/students/${id}`);
      setStudents(prev => prev.filter(s => s.id !== id));
      showToast('Student deleted successfully');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const { confirmPassword, ...payloadData } = formData;
      const payload = {
        ...payloadData,
        standard: parseInt(formData.standard),
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      console.log('Add Student Payload:', payload);
      if (!user?.uid) throw new Error("User ID missing");
      const response = await api.post(`/teachers/${user.uid}/students`, payload);
      console.log('Add Student API Response:', response);
      showToast('Student created successfully! Login credentials: ' + formData.email);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', confirmPassword: '', board: '', standard: '', phone: '', subjects: '', schoolName: '', parentName: '', parentPhone: '', parentEmail: '', parentProfession: '', parentCompanyName: '', parentDesignation: '' });
      setShowPassword(false);
      setShowConfirmPassword(false);
      loadStudents();
    } catch (error: any) {
      showToast(error.message || 'Failed to create student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Students</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Board</label>
          <select 
            value={filters.board}
            onChange={(e) => setFilters(prev => ({ ...prev, board: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
          >
            <option value="">All Boards</option>
            {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Standard</label>
          <select 
             value={filters.standard}
             onChange={(e) => setFilters(prev => ({ ...prev, standard: e.target.value }))}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
          >
            <option value="">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setFilters({ board: '', standard: '' })}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No students found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Board</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Standard</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  {user?.role === 'admin' && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="hover:bg-gray-50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{student.board}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.standard}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${student.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleDelete(student.id, student.name, e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                          title="Delete student"
                        >
                          <Trash2 size={16} />Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Student">
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
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  minLength={6} 
                  placeholder="Min 6 characters" 
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <input 
                  required 
                  type={showConfirmPassword ? "text" : "password"} 
                  minLength={6} 
                  placeholder="Re-enter password" 
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
                  value={formData.confirmPassword} 
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})}>
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                <option value="">Select</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone *</label>
              <input required type="tel" pattern="[0-9]{10}" placeholder="10 digit number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentEmail} onChange={e => setFormData({...formData, parentEmail: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Profession</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentProfession} onChange={e => setFormData({...formData, parentProfession: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Company Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentCompanyName} onChange={e => setFormData({...formData, parentCompanyName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Designation</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.parentDesignation} onChange={e => setFormData({...formData, parentDesignation: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated) *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="Maths, Physics, Chemistry" value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {submitting ? 'Saving...' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
