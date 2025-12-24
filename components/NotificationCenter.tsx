import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Notification, ApiListResponse, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, BookOpen, ClipboardCheck, DollarSign, MessageSquare, UserCheck, Calendar, AlertCircle } from 'lucide-react';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotificationsAndMessages();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotificationsAndMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotificationsAndMessages = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get<ApiListResponse<Notification>>('/notifications?limit=20'),
        api.get<ApiListResponse<Message>>('/messages?limit=20')
      ]);
      
      const notifList = notifRes.items || [];
      let msgList = msgRes.items || [];
      
      // Filter messages that are announcements/new schedules for display
      msgList = msgList.filter(m => m.type === 'announcement' || m.type === 'notice');
      
      setNotifications(notifList);
      setMessages(msgList);
      
      // Count unread items (notifications without isRead flag are unread by default)
      const unreadNotifs = notifList.filter(n => !n.isRead).length;
      const unreadMsgs = msgList.filter(m => m.status === 'unread').length;
      setUnreadCount(unreadNotifs + unreadMsgs);
    } catch (error) {
      console.error('Failed to load notifications/messages:', error);
      setNotifications([]);
      setMessages([]);
    }
  };

  const markAsRead = async (notificationId: string, isMessage: boolean = false) => {
    try {
      if (isMessage) {
        await api.post(`/messages/${notificationId}/read`, { userId: user?.uid });
        setMessages(prev =>
          prev.map(m => (m.id === notificationId ? { ...m, status: 'read' } : m))
        );
      } else {
        await api.put(`/notifications/${notificationId}/read`, {});
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all([
        api.put('/notifications/mark-all-read', {}),
        api.post('/messages/mark-all-read', { userId: user?.uid }).catch(() => {}) // Optional if not implemented
      ]);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setMessages(prev => prev.map(m => ({ ...m, status: 'read' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, isMessage: boolean = false) => {
    try {
      if (isMessage) {
        await api.delete(`/messages/${notificationId}`);
        setMessages(prev => {
          const updated = prev.filter(m => m.id !== notificationId);
          const deleted = prev.find(m => m.id === notificationId);
          if (deleted && deleted.status === 'unread') {
            setUnreadCount(p => Math.max(0, p - 1));
          }
          return updated;
        });
      } else {
        await api.delete(`/notifications/${notificationId}`);
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== notificationId);
          const deleted = prev.find(n => n.id === notificationId);
          if (deleted && !deleted.isRead) {
            setUnreadCount(p => Math.max(0, p - 1));
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'homework':
        return <BookOpen size={16} className="text-purple-600" />;
      case 'test':
        return <ClipboardCheck size={16} className="text-blue-600" />;
      case 'fee':
        return <DollarSign size={16} className="text-green-600" />;
      case 'message':
        return <MessageSquare size={16} className="text-orange-600" />;
      case 'attendance':
        return <UserCheck size={16} className="text-indigo-600" />;
      case 'leave':
        return <Calendar size={16} className="text-pink-600" />;
      case 'result':
        return <ClipboardCheck size={16} className="text-teal-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (isDarkMode) {
      if (priority === 'urgent') return 'border-red-700 bg-red-900/30';
      if (priority === 'high') return 'border-orange-700 bg-orange-900/30';
      
      switch (type) {
        case 'homework':
          return 'border-purple-700 bg-purple-900/30';
        case 'test':
          return 'border-blue-700 bg-blue-900/30';
        case 'fee':
          return 'border-green-700 bg-green-900/30';
        case 'message':
          return 'border-orange-700 bg-orange-900/30';
        case 'attendance':
          return 'border-indigo-700 bg-indigo-900/30';
        default:
          return 'border-gray-700 bg-gray-800/30';
      }
    } else {
      if (priority === 'urgent') return 'border-red-300 bg-red-50';
      if (priority === 'high') return 'border-orange-300 bg-orange-50';
      
      switch (type) {
        case 'homework':
          return 'border-purple-200 bg-purple-50';
        case 'test':
          return 'border-blue-200 bg-blue-50';
        case 'fee':
          return 'border-green-200 bg-green-50';
        case 'message':
          return 'border-orange-200 bg-orange-50';
        case 'attendance':
          return 'border-indigo-200 bg-indigo-50';
        default:
          return 'border-gray-200 bg-gray-50';
      }
    }
  };

  const formatTimestamp = (timestamp: string | { _seconds: number; _nanoseconds: number }) => {
    const date = typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : new Date(timestamp._seconds * 1000);
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
{isOpen && (
  <div className={`absolute right-0 mt-2 w-96 rounded-xl shadow-2xl border z-50 max-h-[600px] flex flex-col ${
    isDarkMode 
      ? 'bg-gray-900 border-gray-700 text-gray-100' 
      : 'bg-white border-gray-200 text-gray-900'
  }`}>
    {/* Header */}
    <div className={`p-4 border-b flex items-center justify-between ${
      isDarkMode 
        ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900' 
        : 'border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50'
    }`}>
      <div>
        <h3 className={`font-bold text-lg ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>Notifications</h3>
        <p className={`text-xs ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>{unreadCount} unread</p>
      </div>
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className={`text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border transition ${
            isDarkMode 
              ? 'text-blue-400 hover:text-blue-300 bg-gray-800 border-gray-600 hover:bg-gray-700' 
              : 'text-blue-600 hover:text-blue-700 bg-white border-blue-200 hover:bg-blue-50'
          }`}
        >
          <Check size={14} /> Mark all read
        </button>
      )}
    </div>

    {/* Notifications List */}
    <div className="overflow-y-auto flex-1">
      {loading ? (
        <div className={`p-8 text-center ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>Loading...</div>
      ) : (notifications.length === 0 && messages.length === 0) ? (
        <div className="p-8 text-center">
          <Bell size={48} className={`mx-auto mb-3 ${
            isDarkMode ? 'text-gray-700' : 'text-gray-300'
          }`} />
          <p className={`font-medium ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>No notifications yet</p>
          <p className={`text-xs mt-1 ${
            isDarkMode ? 'text-gray-600' : 'text-gray-400'
          }`}>You're all caught up!</p>
        </div>
      ) : (
        <div className={`divide-y ${
          isDarkMode ? 'divide-gray-800' : 'divide-gray-100'
        }`}>
          {/* Messages Section */}
          {messages.length > 0 && (
            <>
              <div className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                📢 Announcements & Messages
              </div>
              {messages.map((message) => (
                <div
                  key={`msg-${message.id}`}
                  className={`p-4 transition cursor-pointer ${
                    isDarkMode 
                      ? 'hover:bg-gray-800' 
                      : 'hover:bg-gray-50'
                  } ${
                    message.status === 'unread' ? (
                      isDarkMode 
                        ? 'bg-blue-900/30 border-l-4 border-l-blue-500' 
                        : 'bg-blue-50 border-l-4 border-l-blue-500'
                    ) : ''
                  }`}
                  onClick={() => {
                    if (message.status === 'unread') markAsRead(message.id, true);
                    setIsOpen(false);
                    navigate('/messages');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${
                      isDarkMode 
                        ? 'border-blue-700 bg-blue-900/30' 
                        : 'border-blue-200 bg-blue-50'
                    }`}>
                      <MessageSquare size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${
                          message.status === 'unread' 
                            ? (isDarkMode ? 'text-gray-100' : 'text-gray-900')
                            : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                        }`}>
                          {message.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(message.id, true);
                          }}
                          className={`transition ${
                            isDarkMode 
                              ? 'text-gray-500 hover:text-red-400' 
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className={`text-xs mb-2 line-clamp-2 whitespace-pre-wrap ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {message.content}
                      </p>
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {new Date(message.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* System Notifications Section */}
          {notifications.length > 0 && (
            <>
              <div className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                🔔 System Notifications
              </div>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition cursor-pointer ${
                isDarkMode 
                  ? 'hover:bg-gray-800' 
                  : 'hover:bg-gray-50'
              } ${
                !notification.isRead ? (
                  isDarkMode 
                    ? 'bg-blue-900/30 border-l-4 border-l-blue-500' 
                    : 'bg-blue-50 border-l-4 border-l-blue-500'
                ) : ''
              }`}
              onClick={() => {
                if (!notification.isRead) markAsRead(notification.id);
                setIsOpen(false);
                navigate('/messages');
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border ${
                  isDarkMode 
                    ? 'border-gray-700' 
                    : getNotificationColor(notification.type, notification.priority)
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-semibold ${
                      !notification.isRead 
                        ? (isDarkMode ? 'text-gray-100' : 'text-gray-900')
                        : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                    }`}>
                      {notification.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className={`transition ${
                        isDarkMode 
                          ? 'text-gray-500 hover:text-red-400' 
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className={`text-xs mb-2 line-clamp-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(notification.createdAt)}
                    </span>
                    {notification.priority === 'urgent' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isDarkMode 
                          ? 'bg-red-900/30 text-red-300' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        Urgent
                      </span>
                    )}
                    {notification.priority === 'high' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isDarkMode 
                          ? 'bg-orange-900/30 text-orange-300' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        High
                      </span>
                    )}
                    {notification.priority === 'normal' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isDarkMode 
                          ? 'bg-blue-900/30 text-blue-300' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        Normal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
            </>
          )}
        </div>
      )}
    </div>

          {/* Footer */}
          {(notifications.length > 0 || messages.length > 0) && (
            <div className={`p-3 border-t ${
              isDarkMode 
                ? 'border-gray-700 bg-gray-800' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <button className={`w-full text-center text-sm font-medium transition ${
                isDarkMode 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-blue-600 hover:text-blue-700'
              }`}>
                View All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
