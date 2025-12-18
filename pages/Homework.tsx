
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, Plus, Calendar, BookOpen, CheckCircle, Edit2, Trash2, PenTool } from 'lucide-react';
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
  const { isDarkMode } = useDarkMode();

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
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <PenTool className="text-purple-600" size={36} />
          Homework
        </h1>
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
         <div className={`text-center p-8 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}`}>No homework assigned yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {homeworkList.map(hw => (
            <div 
              key={hw.id} 
              onClick={() => handleViewHomework(hw)}
              className={`p-6 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer transition ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:shadow-lg' : 'bg-white border-gray-100 hover:shadow-md'}`}>
              <div className="space-y-1 flex-1">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{hw.title}</h3>
                <div className={`flex items-center gap-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="flex items-center gap-1"><BookOpen size={14} /> {hw.subject}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> Due: {new Date(hw.dueAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                   Assigned to {hw.assignTo?.length || 0} students
                 </div>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${hw.status === 'assigned' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')}`}>
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
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
            <input required type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="e.g., Chapter 1 Exercise" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          {/* Assignment Mode Selection */}
          <div className={`border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assignment Mode *</label>
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
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>By Standard/Board</span>
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
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Specific Student(s)</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject *</label>
              <input required type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Due Date *</label>
              <input required type="date" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>

          {assignmentMode === 'standard' && (
            <div className={`grid grid-cols-2 gap-4 border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
               <div>
                 <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter Board *</label>
                 <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})}>
                   <option value="">Select Board</option>
                   {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
               </div>
               <div>
                 <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter Standard *</label>
                 <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                   <option value="">Select Standard</option>
                   {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {assignmentMode === 'standard' 
                ? `Assign To Students in ${formData.standard || 'Selected Standard'} (${selectedStudents.length} selected)` 
                : `Select Specific Student(s) (${selectedStudents.length} selected)`}
            </label>
            <div className={`max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              {availableStudents.length > 0 ? availableStudents.map(s => (
                <div key={s.id} onClick={() => toggleStudent(s.id)} className={`p-2 rounded cursor-pointer flex items-center justify-between ${selectedStudents.includes(s.id) ? (isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-100 border-blue-200') : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
                   <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{s.name} <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({s.standard})</span></span>
                   {selectedStudents.includes(s.id) && <CheckCircle size={16} className="text-blue-600"/>}
                </div>
              )) : (
                <p className={`text-sm text-center py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {assignmentMode === 'standard' 
                    ? 'Please select Board and Standard first' 
                    : 'No students found'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Instructions</label>
            <textarea className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
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
            className={`rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 animate-slideUp ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedHomework.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                    <BookOpen size={16} /> {selectedHomework.subject}
                  </span>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                    <Calendar size={16} /> Due: {new Date(selectedHomework.dueAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHomework(null)}
                className={`transition text-2xl leading-none ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold uppercase mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Instructions</h3>
                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{(selectedHomework as any).instructions || 'No instructions provided'}</p>
              </div>

              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-pink-900' : 'bg-pink-50'}`}>
                <h3 className={`text-sm font-semibold uppercase mb-2 ${isDarkMode ? 'text-pink-300' : 'text-pink-700'}`}>Assignment Details</h3>
                <div className={`mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  <span className="font-semibold">Assigned to:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedHomework.assignTo?.map(studentId => {
                      const student = students.find(s => s.id === studentId);
                      return student ? (
                        <span key={studentId} className={`px-3 py-1 rounded-full text-sm font-medium border ${isDarkMode ? 'bg-gray-700 text-pink-300 border-pink-600' : 'bg-white text-pink-700 border-pink-200'}`}>
                          {student.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status: <span className="font-medium">{selectedHomework.status}</span></p>
              </div>
            </div>

            <p className={`text-xs text-center mt-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>This popup will close automatically in 5 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
