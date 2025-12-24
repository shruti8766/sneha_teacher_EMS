import React, { useEffect, useState } from 'react';
import { Meeting, MeetingComment, ApiListResponse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Users, MessageSquare, Send, Loader2, Trash2, User } from 'lucide-react';
import Modal from './Modal';

interface MeetingDetailsModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onMeetingUpdated: () => void;
}

const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  meeting,
  isOpen,
  onClose,
  isDarkMode,
  onMeetingUpdated,
}) => {
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, meeting.id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiListResponse<MeetingComment>>(
        `/meetings/${meeting.id}/comments`
      );
      if (response.ok && response.items) {
        setComments(response.items);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue: any): string => {
    try {
      if (!dateValue) return 'Date unavailable';
      
      // Handle Firestore Timestamp objects
      if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
        return dateValue.toDate().toLocaleString();
      }
      
      // Handle Date objects
      if (dateValue instanceof Date) {
        return dateValue.toLocaleString();
      }
      
      // Handle strings
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Date unavailable';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'Date unavailable';
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      showToast('Please enter a comment', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const commentData = {
        meetingId: meeting.id,
        content: newComment.trim(),
      };
      await api.post(`/meetings/${meeting.id}/comments`, commentData);
      showToast('Comment added successfully', 'success');
      setNewComment('');
      loadComments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add comment';
      showToast(errorMessage, 'error');
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setSubmitting(true);
      await api.delete(`/meetings/${meeting.id}/comments/${commentId}`);
      showToast('Comment deleted successfully', 'success');
      loadComments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete comment';
      showToast(errorMessage, 'error');
      console.error('Error deleting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'scheduled':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'ongoing':
        return { bg: 'bg-amber-100', text: 'text-amber-800' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const statusColor = getStatusColor(meeting.status);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" isDarkMode={isDarkMode}>
    <div className="rounded-lg">
      <div className={`flex flex-col gap-4 p-4`}>
        {/* Header with Title and Status */}
        <div>
          <div className="flex justify-between items-start gap-3 mb-2">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {meeting.title}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}>
              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
            </span>
          </div>
          {meeting.description && (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {meeting.description}
            </p>
          )}
        </div>

        {/* Meeting Details - Compact Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Date */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-purple-600 flex-shrink-0" />
              <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Date
              </span>
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Time */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-blue-600 flex-shrink-0" />
              <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Time
              </span>
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {meeting.startTime.substring(0, 5)} - {meeting.endTime.substring(0, 5)}
            </p>
          </div>

          {/* Type / Participants */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-green-600 flex-shrink-0" />
              <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meeting.type === 'all_parents' ? 'All' : 'Specific'}
              </span>
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {meeting.type === 'specific_parent' ? `${meeting.parentIds?.length || 0} Parent${meeting.parentIds?.length !== 1 ? 's' : ''}` : 'All Parents'}
            </p>
          </div>
        </div>

        {/* Location */}
        {meeting.location && (
          <div className={`p-3 rounded-lg flex items-start gap-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <MapPin size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Location
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} break-words`}>
                {meeting.location}
              </p>
            </div>
          </div>
        )}

        {/* Notes Section - Compact */}
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-purple-600" />
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Notes
              </h3>
            </div>
            <span className="text-xs font-medium text-purple-600">
              {comments.length}
            </span>
          </div>

          {/* Comments List - Scrollable */}
          <div className={`space-y-2 mb-2 max-h-40 overflow-y-auto p-2 rounded border ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
          }`}>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin w-4 h-4 text-purple-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className={`text-xs text-center py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No notes yet
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-2 rounded text-xs border-l-2 border-purple-500 ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start gap-1 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-xs truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {comment.createdByName || 'Admin'}
                      </p>
                    </div>
                    {(user?.uid === comment.createdBy || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className={`p-0.5 rounded flex-shrink-0 transition-colors ${isDarkMode ? 'hover:bg-red-700 hover:bg-opacity-30' : 'hover:bg-red-100'}`}
                        title="Delete"
                        disabled={submitting}
                      >
                        <Trash2 size={12} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                      </button>
                    )}
                  </div>
                  <p className={`text-xs break-words ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form - Compact */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add note..."
              className={`flex-1 px-2.5 py-1.5 rounded text-xs border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-1 focus:ring-purple-500`}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className={`flex gap-2 p-4 pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <button
          onClick={onClose}
          className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
        >
          Close
        </button>
      </div>
    </div>
    </Modal>
  );
};

export default MeetingDetailsModal;
