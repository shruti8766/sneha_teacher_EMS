
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Test, Batch, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, Clock, Calendar, FileText, Award, Edit2, Trash2, Users, User as UserIcon } from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

const Tests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    board: '',
    standard: '',
    dateTime: '',
    maxMarks: '',
    durationMin: '',
    description: '',
    assignmentType: 'standard' as 'standard' | 'batch' | 'students',
    batchId: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiListResponse<Test>>('/tests?limit=100');
      setTests(response.items || []);
    } catch (error) {
      showToast('Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const response = await api.get<ApiListResponse<Batch>>('/batches?limit=100');
      setBatches(response.items || []);
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await api.get<ApiListResponse<Student>>('/students?limit=1000');
      setStudents(response.items || []);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  useEffect(() => {
    loadTests();
    loadBatches();
    loadStudents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        subject: formData.subject,
        board: formData.board,
        standard: parseInt(formData.standard),
        totalMarks: parseInt(formData.maxMarks),
        duration: parseInt(formData.durationMin),
        dateTime: new Date(formData.dateTime).toISOString(),
        description: formData.description
      };

      // Add assignment-specific fields
      if (formData.assignmentType === 'batch' && formData.batchId) {
        payload.batchId = formData.batchId;
      } else if (formData.assignmentType === 'students' && selectedStudents.length > 0) {
        // Use assignTo array with student userIds (like homework)
        payload.assignTo = selectedStudents;
      }

      if (editingTest) {
        await api.put(`/tests/${editingTest.id}`, payload);
        showToast('Test updated successfully');
      } else {
        await api.post('/tests', payload);
        showToast('Test scheduled successfully');
      }
      
      setIsModalOpen(false);
      setEditingTest(null);
      resetForm();
      loadTests();
    } catch (error: any) {
      showToast(error.message || `Failed to ${editingTest ? 'update' : 'create'} test`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (test: Test) => {
    setEditingTest(test);
    setFormData({
      title: test.title || '',
      subject: test.subject,
      board: test.board,
      standard: test.standard.toString(),
      dateTime: test.dateTime ? new Date(test.dateTime).toISOString().slice(0, 16) : '',
      maxMarks: (test.totalMarks || test.maxMarks || '').toString(),
      durationMin: (test.duration || test.durationMin || '').toString(),
      description: test.description || '',
      assignmentType: (test as any).batchId ? 'batch' : (test as any).assignTo ? 'students' : 'standard',
      batchId: (test as any).batchId || ''
    });
    setSelectedStudents((test as any).assignTo || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (testId: string, testTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${testTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/tests/${testId}`);
      setTests(prev => prev.filter(t => t.id !== testId));
      showToast('Test deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete test', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      board: '',
      standard: '',
      dateTime: '',
      maxMarks: '',
      durationMin: '',
      description: '',
      assignmentType: 'standard',
      batchId: ''
    });
    setSelectedStudents([]);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTest(null);
    resetForm();
  };

  const getStatusColor = (date: string) => {
    const testDate = new Date(date);
    const now = new Date();
    return testDate > now ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (date: string) => {
    const testDate = new Date(date);
    const now = new Date();
    return testDate > now ? 'Upcoming' : 'Completed';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Tests</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Schedule Test
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" /></div>
      ) : tests.length === 0 ? (
        <div className="text-center text-gray-500 p-8 bg-white rounded-xl border border-gray-100">No tests scheduled.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map(test => (
            <div key={test.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{test.title || test.subject}</h3>
                  <p className="text-sm text-gray-500">{test.subject} • {test.board} • Std {test.standard}</p>
                  {(test as any).batchId && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      <Users size={12} /> Batch Assigned
                    </span>
                  )}
                  {(test as any).assignTo && (test as any).assignTo.length > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                      <UserIcon size={12} /> {(test as any).assignTo.length} Student{(test as any).assignTo.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(test.dateTime)}`}>
                    {getStatusText(test.dateTime)}
                  </span>
                  {user?.role === 'admin' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(test)}
                        className="text-gray-400 hover:text-blue-600 transition p-1"
                        title="Edit test"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id, test.title || test.subject)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                        title="Delete test"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-purple-500" />
                  <span>{test.dateTime ? new Date(test.dateTime).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-purple-500" />
                  <span>{test.dateTime ? new Date(test.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-500" />
                  <span>{test.duration || test.durationMin || 'N/A'} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-purple-500" />
                  <span>{test.totalMarks || test.maxMarks || 'N/A'} Marks</span>
                </div>
              </div>
              
              {test.description && (
                <p className="mt-4 text-sm text-gray-600 line-clamp-2">{test.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingTest ? 'Edit Test' : 'Schedule New Test'}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="e.g. Mid-Term" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})}>
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                <option value="">Select</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
              <input required type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins) *</label>
              <input required type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.durationMin} onChange={e => setFormData({...formData, durationMin: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks *</label>
            <input required type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.maxMarks} onChange={e => setFormData({...formData, maxMarks: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          {/* Assignment Type Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Assignment Type</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  value="standard"
                  checked={formData.assignmentType === 'standard'}
                  onChange={e => setFormData({...formData, assignmentType: e.target.value as any, batchId: '', studentId: ''})}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">All Students (by Standard)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  value="batch"
                  checked={formData.assignmentType === 'batch'}
                  onChange={e => setFormData({...formData, assignmentType: e.target.value as any, studentId: ''})}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Specific Batch</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  value="students"
                  checked={formData.assignmentType === 'students'}
                  onChange={e => setFormData({...formData, assignmentType: e.target.value as any, batchId: ''})}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Specific Students</span>
              </label>
            </div>

            {formData.assignmentType === 'batch' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch *</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900"
                  value={formData.batchId}
                  onChange={e => setFormData({...formData, batchId: e.target.value})}
                >
                  <option value="">Choose a batch</option>
                  {batches
                    .filter(b => b.standard === parseInt(formData.standard) && b.board === formData.board)
                    .map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} - {batch.subject}
                      </option>
                    ))}
                  {batches.filter(b => b.standard === parseInt(formData.standard) && b.board === formData.board).length === 0 && (
                    <option disabled>No batches available for selected board/standard</option>
                  )}
                </select>
              </div>
            )}

            {formData.assignmentType === 'students' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Students *</label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                  {students
                    .filter(s => s.standard === parseInt(formData.standard) && s.board === formData.board)
                    .map(student => (
                      <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.userId)}
                          onChange={() => {
                            setSelectedStudents(prev =>
                              prev.includes(student.userId)
                                ? prev.filter(id => id !== student.userId)
                                : [...prev, student.userId]
                            );
                          }}
                          className="text-purple-600 focus:ring-purple-500 rounded"
                        />
                        <span className="text-sm text-gray-700">{student.name} - {student.email}</span>
                      </label>
                    ))}
                  {students.filter(s => s.standard === parseInt(formData.standard) && s.board === formData.board).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No students available for selected board/standard</p>
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">{selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={handleModalClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
              {submitting ? (editingTest ? 'Updating...' : 'Scheduling...') : (editingTest ? 'Update Test' : 'Schedule Test')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tests;
