import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { MessageSquare, Trash2, Eye, Loader2, Mail } from 'lucide-react';

interface Message {
  id: string;
  recipientId: string;
  recipientType: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'read' | 'unread';
  createdAt?: any;
  senderName?: string;
}

const StudentMessages: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get student profile first
      const studentResponse = await api.get<any>(`/students/${user.uid}`);
      const studentProfile = studentResponse.student || studentResponse;

      // Get all messages
      const response = await api.get<any>('/messages?limit=500');
      let messagesList = response.messages || response.items || [];
      
      const studentDocId = studentProfile.id;
      console.log('Student userId:', user.uid, 'Student documentId:', studentDocId);
      console.log('All messages from API:', messagesList.length);
      
      // Filter messages to show only:
      // 1. Messages sent to all students
      // 2. Messages sent to this specific student's board
      // 3. Messages sent to this specific student's standard
      // 4. Messages sent to this specific student (recipientIds includes userId OR documentId)
      // 5. Messages sent to batch that includes this student (check both userId and documentId)
      messagesList = messagesList.filter((m: any) => {
        console.log('Message:', m.title, 'recipientType:', m.recipientType, 'recipientIds:', m.recipientIds);
        
        if (m.recipientType === 'all') return true;
        if (m.recipientType === 'board' && m.board === studentProfile.board) return true;
        if (m.recipientType === 'standard' && m.standard === studentProfile.standard) return true;
        
        // For batch messages, check recipientIds against both userId and documentId
        if (m.recipientType === 'batch' && m.recipientIds && Array.isArray(m.recipientIds)) {
          const isIncluded = m.recipientIds.includes(user.uid) || m.recipientIds.includes(studentDocId);
          if (isIncluded) {
            console.log('✓ Batch message matched for student:', m.title);
            return true;
          }
        }
        
        // For specific students, check recipientIds against both userId and documentId
        if (m.recipientType === 'students' && m.recipientIds && Array.isArray(m.recipientIds)) {
          const isIncluded = m.recipientIds.includes(user.uid) || m.recipientIds.includes(studentDocId);
          if (isIncluded) {
            console.log('✓ Message matched for student:', m.title);
            return true;
          }
        }
        
        // For backward compatibility with old 'student' recipientType
        if (m.studentId && (m.studentId === user.uid || m.studentId === studentDocId)) return true;
        
        return false;
      });

      console.log(`Messages for student ${user.uid}:`, messagesList.length, 'filtered messages');
      
      setMessages(messagesList);
    } catch (error: any) {
      showToast(error.message || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (message: Message) => {
    if (message.status === 'read') return;

    try {
      await api.post(`/messages/${message.id}/read`, { userId: user?.uid });
      setMessages(prev =>
        prev.map(m =>
          m.id === message.id ? { ...m, status: 'read' } : m
        )
      );
      if (selectedMessage?.id === message.id) {
        setSelectedMessage({ ...selectedMessage, status: 'read' });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to mark as read', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setIsDetailOpen(false);
        setSelectedMessage(null);
      }
      showToast('Message deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete message', 'error');
    }
  };

  const openMessageDetail = (message: Message) => {
    setSelectedMessage(message);
    setIsDetailOpen(true);
    handleMarkAsRead(message);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'normal':
        return 'text-blue-700 bg-blue-100';
      case 'low':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return '-';
    const timestamp = dateObj._seconds ? dateObj._seconds * 1000 : new Date(dateObj).getTime();
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600">
          You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2">
          {messages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No messages</h3>
              <p className="text-gray-600">You don't have any messages</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  onClick={() => openMessageDetail(message)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    message.status === 'unread'
                      ? 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100'
                      : 'bg-white border-l-4 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium mb-1 ${message.status === 'unread' ? 'text-blue-900' : 'text-gray-900'}`}>
                        {message.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mb-2">{message.content}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded capitalize ${getPriorityColor(message.priority)}`}>
                          {message.priority}
                        </span>
                        <span className="text-gray-500">{formatDate(message.createdAt)}</span>
                      </div>
                    </div>
                    {message.status === 'unread' && (
                      <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        {isDetailOpen && selectedMessage ? (
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 h-fit sticky top-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex-1 break-words">
                {selectedMessage.title}
              </h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailOpen(false);
                }}
                className="text-gray-500 hover:text-gray-700 ml-2"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(selectedMessage.priority)}`}>
                  {selectedMessage.priority}
                </span>
                <span className="text-xs text-gray-500">{formatDate(selectedMessage.createdAt)}</span>
              </div>
              {selectedMessage.senderName && (
                <p className="text-sm text-gray-600">From: {selectedMessage.senderName}</p>
              )}
            </div>

            <div className="mb-6 min-h-24 text-gray-700 whitespace-pre-wrap">
              {selectedMessage.content}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 h-fit sticky top-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 text-sm">Select a message to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMessages;
