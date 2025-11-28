
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ApiListResponse, Batch, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Users, Plus, Trash2, Search, X } from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    board: '',
    standard: '',
    subject: '',
    description: '',
    maxStudents: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Student search and selection
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStandard, setFilterStandard] = useState('');

  const loadBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiListResponse<Batch>>('/batches?limit=100');
      console.log('Loaded batches:', response.items);
      response.items.forEach(batch => {
        console.log(`Batch ${batch.name}:`, {
          id: batch.id,
          studentIds: batch.studentIds,
          studentIdsType: typeof batch.studentIds,
          studentIdsLength: batch.studentIds?.length,
          fullBatch: batch
        });
      });
      setBatches(response.items);
    } catch (error) {
      showToast('Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await api.get<ApiListResponse<Student>>('/students?limit=1000');
      setAllStudents(response.items);
      setFilteredStudents(response.items);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  useEffect(() => {
    loadBatches();
    loadStudents();
    // eslint-disable-next-line
  }, []);

  // Filter students based on search query and standard
  useEffect(() => {
    let filtered = allStudents;

    // Filter by standard
    if (filterStandard) {
      filtered = filtered.filter(s => s.standard === parseInt(filterStandard));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      );
    }

    // Exclude already selected students
    filtered = filtered.filter(s => !selectedStudents.find(sel => sel.id === s.id));

    setFilteredStudents(filtered);
  }, [searchQuery, filterStandard, allStudents, selectedStudents]);

  const handleDeleteBatch = async (batchId: string, batchName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete "${batchName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/batches/${batchId}`);
      console.log('Delete response:', response);
      
      // Only remove from local state if we get a successful response
      if (response && (response.ok || response.ok === undefined)) {
        setBatches(prev => prev.filter(b => b.id !== batchId));
        showToast('Batch deleted successfully', 'success');
      } else {
        showToast('Delete failed: Backend returned unsuccessful response', 'error');
      }
    } catch (error: any) {
      console.error('Delete batch error:', error);
      
      if (error.message.includes('404')) {
        showToast('Batch not found or delete endpoint not available', 'error');
      } else if (error.message.includes('Cannot DELETE')) {
        showToast('Delete endpoint not implemented on server', 'error');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        standard: parseInt(formData.standard),
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined,
        studentIds: selectedStudents.map(s => s.id)
      };
      console.log('Creating batch with payload:', payload);
      console.log('Selected students count:', selectedStudents.length);
      const response = await api.post('/batches', payload);
      console.log('Batch creation response:', response);
      console.warn('⚠️ BACKEND BUG: studentIds field is not being persisted by the backend. Frontend sends studentIds array but backend returns empty array on GET /batches');
      showToast('Batch created successfully (Note: Student enrollment not working due to backend issue)', 'success');
      setIsModalOpen(false);
      setFormData({ name: '', board: '', standard: '', subject: '', description: '', maxStudents: '' });
      setSelectedStudents([]);
      setSearchQuery('');
      setFilterStandard('');
      loadBatches();
    } catch (error: any) {
      showToast(error.message || 'Failed to create batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = (student: Student) => {
    setSelectedStudents(prev => [...prev, student]);
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleDragStart = (e: React.DragEvent, student: Student) => {
    e.dataTransfer.setData('student', JSON.stringify(student));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const studentData = e.dataTransfer.getData('student');
    if (studentData) {
      const student = JSON.parse(studentData);
      if (!selectedStudents.find(s => s.id === student.id)) {
        handleAddStudent(student);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Batches</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 text-white px-6 py-2.5 rounded-lg hover:bg-orange-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Create Batch
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : batches.length === 0 ? (
         <div className="text-center text-gray-500 p-8 bg-white rounded-xl border border-gray-100">No batches found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(batch => (
            <div
              key={batch.id}
              onClick={() => navigate(`/batches/${batch.id}`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">{batch.name}</h3>
                {user?.role === 'admin' && (
                  <button
                    onClick={(e) => handleDeleteBatch(batch.id, batch.name, e)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition"
                    title="Delete batch"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-500 mb-4">{batch.subject} • {batch.board} • Std {batch.standard}</div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                <Users size={16} />
                <span>{batch.studentIds?.length || 0} Students enrolled</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Batch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="e.g., Class 10-A Maths" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
              <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.maxStudents} onChange={e => setFormData({...formData, maxStudents: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          {/* Student Selection Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Add Students to Batch</label>
            
            {/* Search and Filter */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900 text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900 text-sm"
                value={filterStandard}
                onChange={e => setFilterStandard(e.target.value)}
              >
                <option value="">All Standards</option>
                {STANDARDS.map(s => <option key={s} value={s}>Standard {s}</option>)}
              </select>
            </div>

            {/* Selected Students Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="min-h-[100px] p-3 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50 mb-3"
            >
              <p className="text-xs text-gray-500 mb-2">Selected Students ({selectedStudents.length}) - Drag students here or click to add</p>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-orange-200 shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-800">{student.name}</span>
                    <span className="text-xs text-gray-500">Std {student.standard}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {selectedStudents.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No students selected yet</p>
                )}
              </div>
            </div>

            {/* Available Students List */}
            <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg">
              {filteredStudents.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredStudents.slice(0, 50).map(student => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, student)}
                      onClick={() => handleAddStudent(student)}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">Standard {student.standard} • {student.board}</p>
                      </div>
                      <Plus size={16} className="text-orange-600" />
                    </div>
                  ))}
                  {filteredStudents.length > 50 && (
                    <p className="p-3 text-xs text-gray-500 text-center">
                      Showing first 50 students. Use filters to narrow results.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {searchQuery || filterStandard ? 'No students match your filters' : 'No students available'}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition">
              {submitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Batches;
