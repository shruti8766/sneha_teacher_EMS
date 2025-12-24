import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Message, Batch, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import {
  Loader2,
  Plus,
  Mail,
  Bell,
  AlertTriangle,
  Info,
  Send,
  X,
  Filter,
  Search,
  Calendar,
  Users,
  Eye,
  Trash2,
  Edit2,
  MessageSquare
} from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    type: 'notice' as 'notice' | 'announcement' | 'alert' | 'reminder',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    recipientType: 'all' as 'all' | 'batch' | 'students' | 'standard' | 'board',
    batchId: '',
    board: '',
    standard: 0,
    expiresAt: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, filterType, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [messagesRes, batchesRes, studentsRes] = await Promise.all([
        api.get<ApiListResponse<Message>>('/messages?limit=500'),
        api.get<ApiListResponse<Batch>>('/batches?limit=500'),
        api.get<ApiListResponse<Student>>('/students?limit=1000')
      ]);

      setMessages(messagesRes.items || []);
      setBatches(batchesRes.items || []);
      setStudents(studentsRes.items || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : new Date(a.createdAt._seconds * 1000);
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : new Date(b.createdAt._seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredMessages(filtered);
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      showToast('Only admins and teachers can send messages', 'error');
      return;
    }

    try {
      const payload: any = {
        title: messageForm.title,
        content: messageForm.content,
        type: messageForm.type,
        priority: messageForm.priority,
        recipientType: messageForm.recipientType,
        isActive: true
      };

      // Add recipient-specific fields
      if (messageForm.recipientType === 'batch' && messageForm.batchId) {
        payload.batchId = messageForm.batchId;
      } else if (messageForm.recipientType === 'students' && selectedStudents.length > 0) {
        // Use recipientIds array with student userIds (like homework assignTo)
        payload.recipientIds = selectedStudents;
        console.log('Sending message to specific students:', selectedStudents);
      } else if (messageForm.recipientType === 'board' && messageForm.board) {
        payload.board = messageForm.board;
      } else if (messageForm.recipientType === 'standard' && messageForm.standard) {
        payload.standard = messageForm.standard;
      }

      if (messageForm.expiresAt) {
        payload.expiresAt = messageForm.expiresAt;
      }

      console.log('Message payload being sent:', payload);

      if (editingMessage) {
        await api.put(`/messages/${editingMessage.id}`, payload);
        showToast('Message updated successfully');
      } else {
        await api.post('/messages', payload);
        showToast('Message sent successfully');
      }

      setIsCreateModalOpen(false);
      setEditingMessage(null);
      resetForm();
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setMessageForm({
      title: message.title,
      content: message.content,
      type: message.type,
      priority: message.priority,
      recipientType: message.recipientIds && message.recipientIds.length > 0 ? 'students' : message.recipientType,
      batchId: message.batchId || '',
      board: message.board || '',
      standard: message.standard || 0,
      expiresAt: message.expiresAt || ''
    });
    setSelectedStudents(message.recipientIds || []);
    setIsCreateModalOpen(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await api.delete(`/messages/${messageId}`);
      showToast('Message deleted successfully');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete message', 'error');
    }
  };

  const resetForm = () => {
    setMessageForm({
      title: '',
      content: '',
      type: 'notice',
      priority: 'medium',
      recipientType: 'all',
      batchId: '',
      board: '',
      standard: 0,
      expiresAt: ''
    });
    setSelectedStudents([]);
  };

  const getRecipientDisplay = (message: Message): string => {
    if (message.recipientType === 'all') return 'All Students';
    if (message.recipientType === 'batch' && message.batchId) {
      const batch = batches.find(b => b.id === message.batchId);
      return batch ? `Batch: ${batch.name}` : 'Batch';
    }
    if (message.recipientType === 'student' && message.studentId) {
      const student = students.find(s => s.id === message.studentId);
      return student ? `Student: ${student.name}` : 'Student';
    }
    if (message.recipientType === 'board') return `Board: ${message.board}`;
    if (message.recipientType === 'standard') return `Standard: ${message.standard}`;
    return 'Unknown';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notice': return <Info size={18} className="text-blue-600" />;
      case 'announcement': return <Bell size={18} className="text-green-600" />;
      case 'alert': return <AlertTriangle size={18} className="text-red-600" />;
      case 'reminder': return <Calendar size={18} className="text-orange-600" />;
      default: return <Mail size={18} className="text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (date: string | { _seconds: number; _nanoseconds: number }): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date._seconds * 1000);
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <MessageSquare className="text-pink-600" size={36} />
            Messages & Notices
          </h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send announcements and notices to students</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <button
            onClick={() => {
              setEditingMessage(null);
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus size={20} /> Send Message
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={`rounded-xl shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'}`}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('notice')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'notice'
                  ? 'bg-blue-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Notices
            </button>
            <button
              onClick={() => setFilterType('announcement')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'announcement'
                  ? 'bg-green-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Announcements
            </button>
            <button
              onClick={() => setFilterType('alert')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'alert'
                  ? 'bg-red-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilterType('reminder')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'reminder'
                  ? 'bg-orange-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reminders
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className={`rounded-xl shadow-sm border p-12 text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Mail className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={64} />
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No messages found</p>
          <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Send your first message to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMessages.map(message => (
            <div
              key={message.id}
              className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(message.type)}
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{message.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(message.priority)}`}>
                      {message.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className={`mb-3 whitespace-pre-line leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{message.content}</div>
                  <div className={`flex flex-wrap items-center gap-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{getRecipientDisplay(message)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                    {message.createdByName && (
                      <span className="text-xs">By: {message.createdByName}</span>
                    )}
                    {message.expiresAt && (
                      <span className={`text-xs ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Expires: {new Date(message.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {(user?.role === 'admin' || user?.role === 'teacher') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMessage(message)}
                      className={`p-2 text-indigo-600 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-50'}`}
                      title="Edit Message"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className={`p-2 text-red-600 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                      title="Delete Message"
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

      {/* Create/Edit Message Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMessage(null);
          resetForm();
        }}
        title={editingMessage ? 'Edit Message' : 'Send New Message'}
        isDarkMode={isDarkMode}
      >
        <form onSubmit={handleCreateMessage} className="space-y-4"> 
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
            <input
              required
              type="text"
              value={messageForm.title}
              onChange={e => setMessageForm({ ...messageForm, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              placeholder="Message title"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Content *</label>
            <textarea
              required
              value={messageForm.content}
              onChange={e => setMessageForm({ ...messageForm, content: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              placeholder="Message content"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type *</label>
              <select
                value={messageForm.type}
                onChange={e => setMessageForm({ ...messageForm, type: e.target.value as any })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="notice">Notice</option>
                <option value="announcement">Announcement</option>
                <option value="alert">Alert</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Priority *</label>
              <select
                value={messageForm.priority}
                onChange={e => setMessageForm({ ...messageForm, priority: e.target.value as any })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Send To *</label>
            <select
              value={messageForm.recipientType}
              onChange={e => setMessageForm({ ...messageForm, recipientType: e.target.value as any, batchId: '', board: '', standard: 0 })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              <option value="all">All Students</option>
              <option value="batch">Specific Batch</option>
              <option value="students">Specific Students</option>
              <option value="board">By Board</option>
              <option value="standard">By Standard</option>
            </select>
          </div>

          {messageForm.recipientType === 'batch' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Batch *</label>
              <select
                required
                value={messageForm.batchId}
                onChange={e => setMessageForm({ ...messageForm, batchId: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="">Choose a batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} - {batch.subject} (Std {batch.standard})
                  </option>
                ))}
              </select>
            </div>
          )}

          {messageForm.recipientType === 'students' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Students *</label>
              <div className={`max-h-60 overflow-y-auto border rounded-lg p-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                {students.map(student => (
                  <label key={student.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
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
                      className="text-indigo-600 focus:ring-indigo-500 rounded"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{student.name} - {student.board} Std {student.standard}</span>
                  </label>
                ))}
                {students.length === 0 && (
                  <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No students available</p>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {messageForm.recipientType === 'board' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Board *</label>
              <select
                required
                value={messageForm.board}
                onChange={e => setMessageForm({ ...messageForm, board: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="">Choose a board</option>
                {BOARDS.map(board => (
                  <option key={board} value={board}>{board}</option>
                ))}
              </select>
            </div>
          )}

          {messageForm.recipientType === 'standard' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Standard *</label>
              <select
                required
                value={messageForm.standard}
                onChange={e => setMessageForm({ ...messageForm, standard: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value={0}>Choose a standard</option>
                {STANDARDS.map(std => (
                  <option key={std} value={std}>Standard {std}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Expires At (Optional)</label>
            <input
              type="datetime-local"
              value={messageForm.expiresAt}
              onChange={e => setMessageForm({ ...messageForm, expiresAt: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            />
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingMessage(null);
                resetForm();
              }}
              className={`px-4 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2"
            >
              <Send size={18} />
              {editingMessage ? 'Update' : 'Send'} Message
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Messages;
