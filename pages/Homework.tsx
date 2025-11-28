
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, Calendar, BookOpen, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
  assignTo: string[];
}

const Homework: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    dueDate: '',
    description: '',
    board: '',
    standard: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'standard' | 'specific'>('standard');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hwRes, studentsRes] = await Promise.all([
        api.get<ApiListResponse<HomeworkItem>>('/homework?limit=100'),
        api.get<ApiListResponse<Student>>('/students?limit=100')
      ]);
      setHomeworkList(hwRes.items || []);
      setStudents(studentsRes.items || []);
    } catch (error) {
      // showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter students based on selected board/standard in form
  const availableStudents = students.filter(s => 
    (!formData.board || s.board === formData.board) && 
    (!formData.standard || s.standard.toString() === formData.standard)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      showToast('Please select at least one student', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        instructions: formData.description,
        assignTo: selectedStudents,
        dueAt: new Date(formData.dueDate).toISOString(),
        attachments: [] 
      };
      
      console.log('Homework Assignment Payload:', payload);
      console.log('Selected Students:', selectedStudents);
      console.log('Assignment Mode:', assignmentMode);
      
      if (editingId) {
        await api.put(`/homework/${editingId}`, payload);
        showToast('Homework updated successfully');
        setEditingId(null);
      } else {
        await api.post('/homework', payload);
        showToast('Homework assigned successfully');
      }
      
      setIsModalOpen(false);
      setFormData({ title: '', subject: '', dueDate: '', description: '', board: '', standard: '' });
      setSelectedStudents([]);
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to save homework', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hw: HomeworkItem) => {
    setEditingId(hw.id);
    setFormData({
      title: hw.title,
      subject: hw.subject,
      dueDate: new Date(hw.dueAt).toISOString().split('T')[0],
      description: '',
      board: '',
      standard: ''
    });
    setSelectedStudents(hw.assignTo || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this homework? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/homework/${id}`);
      showToast('Homework deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete homework', 'error');
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleViewHomework = (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    // Auto-close after 5 seconds
    setTimeout(() => {
      setSelectedHomework(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Homework</h1>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', subject: '', dueDate: '', description: '', board: '', standard: '' });
              setSelectedStudents([]);
              setAssignmentMode('standard');
              setIsModalOpen(true);
            }}
            className="bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Assign Homework
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-pink-600" /></div>
      ) : homeworkList.length === 0 ? (
         <div className="text-center text-gray-500 p-8 bg-white rounded-xl border border-gray-100">No homework assigned yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {homeworkList.map(hw => (
            <div 
              key={hw.id} 
              onClick={() => handleViewHomework(hw)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:shadow-md transition">
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-bold text-gray-800">{hw.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen size={14} /> {hw.subject}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> Due: {new Date(hw.dueAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                   Assigned to {hw.assignTo?.length || 0} students
                 </div>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${hw.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                   {hw.status}
                 </span>
                 {(user?.role === 'teacher' || user?.role === 'admin') && (
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleEdit(hw)}
                       className="text-blue-600 hover:text-blue-700 transition p-1"
                       title="Edit homework"
                     >
                       <Edit2 size={18} />
                     </button>
                     <button
                       onClick={() => handleDelete(hw.id)}
                       className="text-red-600 hover:text-red-700 transition p-1"
                       title="Delete homework"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: '', subject: '', dueDate: '', description: '', board: '', standard: '' });
        setSelectedStudents([]);
        setAssignmentMode('standard');
      }} title={editingId ? 'Edit Homework' : 'Assign Homework'}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="e.g., Chapter 1 Exercise" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          {/* Assignment Mode Selection */}
          <div className="border-b pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Assignment Mode *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="standard"
                  checked={assignmentMode === 'standard'}
                  onChange={() => {
                    setAssignmentMode('standard');
                    setSelectedStudents([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">By Standard/Board</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="specific"
                  checked={assignmentMode === 'specific'}
                  onChange={() => {
                    setAssignmentMode('specific');
                    setFormData({ ...formData, board: '', standard: '' });
                    setSelectedStudents([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Specific Student(s)</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input required type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>

          {assignmentMode === 'standard' && (
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Filter Board *</label>
                 <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})}>
                   <option value="">Select Board</option>
                   {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Filter Standard *</label>
                 <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                   <option value="">Select Standard</option>
                   {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {assignmentMode === 'standard' 
                ? `Assign To Students in ${formData.standard || 'Selected Standard'} (${selectedStudents.length} selected)` 
                : `Select Specific Student(s) (${selectedStudents.length} selected)`}
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
              {availableStudents.length > 0 ? availableStudents.map(s => (
                <div key={s.id} onClick={() => toggleStudent(s.id)} className={`p-2 rounded cursor-pointer flex items-center justify-between ${selectedStudents.includes(s.id) ? 'bg-blue-100 border-blue-200' : 'hover:bg-gray-200'}`}>
                   <span className="text-sm text-gray-900">{s.name} <span className="text-xs text-gray-500">({s.standard})</span></span>
                   {selectedStudents.includes(s.id) && <CheckCircle size={16} className="text-blue-600"/>}
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  {assignmentMode === 'standard' 
                    ? 'Please select Board and Standard first' 
                    : 'No students found'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition">
              {submitting ? (editingId ? 'Updating...' : 'Assigning...') : (editingId ? 'Update Homework' : 'Assign Homework')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Homework Detail View Modal - Auto closes after 5 seconds */}
      {selectedHomework && (
        <div 
          onClick={() => setSelectedHomework(null)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 animate-slideUp"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedHomework.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full">
                    <BookOpen size={16} className="text-purple-600" /> {selectedHomework.subject}
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <Calendar size={16} className="text-blue-600" /> Due: {new Date(selectedHomework.dueAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHomework(null)}
                className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Instructions</h3>
                <p className="text-gray-800">{(selectedHomework as any).instructions || 'No instructions provided'}</p>
              </div>

              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-pink-700 uppercase mb-2">Assignment Details</h3>
                <div className="text-gray-800 mb-2">
                  <span className="font-semibold">Assigned to:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedHomework.assignTo?.map(studentId => {
                      const student = students.find(s => s.id === studentId);
                      return student ? (
                        <span key={studentId} className="bg-white px-3 py-1 rounded-full text-sm font-medium text-pink-700 border border-pink-200">
                          {student.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Status: <span className="font-medium">{selectedHomework.status}</span></p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-6">This popup will close automatically in 5 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
