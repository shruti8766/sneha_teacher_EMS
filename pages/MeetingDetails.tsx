import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Meeting, MeetingComment, ApiListResponse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Calendar, Clock, MapPin, Users, MessageSquare, Send, Loader2, Trash2, ArrowLeft } from 'lucide-react';

const MeetingDetails: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [meeting, setMeeting] = useState<Meeting | null>(
    (location.state?.meeting as Meeting) || null
  );
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(!meeting);
  const [submitting, setSubmitting] = useState(false);

  const loadMeetingDetails = async () => {
    try {
      setLoading(true);
      if (!meetingId) return;

      const commentsRes = await api.get<ApiListResponse<MeetingComment>>(
        `/meetings/${meetingId}/comments`
      );

      if (commentsRes.ok && commentsRes.items) {
        setComments(commentsRes.items);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';
      console.error('Error loading comments:', error);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meeting) {
      loadMeetingDetails();
    } else {
      navigate('/meetings');
    }
  }, [meetingId, meeting, navigate]);


  const formatDate = (dateValue: any): string => {
    try {
      if (!dateValue) return 'Date unavailable';
      
      if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
        return dateValue.toDate().toLocaleString();
      }
      
      if (dateValue instanceof Date) {
        return dateValue.toLocaleString();
      }
      
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
        meetingId: meetingId,
        content: newComment.trim(),
      };
      await api.post(`/meetings/${meetingId}/comments`, commentData);
      showToast('Comment added successfully', 'success');
      setNewComment('');
      loadMeetingDetails();
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
      await api.delete(`/meetings/${meetingId}/comments/${commentId}`);
      showToast('Comment deleted successfully', 'success');
      loadMeetingDetails();
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
        <Loader2 className="animate-spin w-8 h-8 text-purple-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Meeting not found</p>
      </div>
    );
  }

  const statusColor = getStatusColor(meeting.status);

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="flex-1 w-full px-4 md:px-6 py-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/meetings')}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <Calendar size={28} className="text-purple-600" />
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Meeting Details
          </h1>
        </div>

        {/* Main Content Card */}
        <div className={`rounded-lg shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Notes Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={20} className="text-purple-600" />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Notes & Comments
              </h3>
              <span className="ml-auto text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                {comments.length}
              </span>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side - Comments List */}
              <div className="lg:col-span-2">
                <div className={`space-y-3 p-4 rounded-lg h-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin w-5 h-5 text-purple-600" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No notes yet. Add one to get started!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg border-l-4 border-purple-500 ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {comment.createdByName || 'Admin'}
                            </p>
                          </div>
                          {(user?.uid === comment.createdBy || user?.role === 'admin') && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-red-700 hover:bg-opacity-30' : 'hover:bg-red-100'}`}
                              title="Delete"
                              disabled={submitting}
                            >
                              <Trash2 size={16} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                            </button>
                          )}
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side - Add Comment Form */}
              <div className="lg:col-span-1">
                <form onSubmit={handleAddComment} className={`flex flex-col gap-3 p-4 rounded-lg h-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Add Note
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a note about parents or students..."
                    rows={8}
                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                      isDarkMode
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50`}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
