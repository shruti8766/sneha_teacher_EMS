import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { User, Mail, Phone, School, BookOpen, Users, Loader2 } from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  board: string;
  standard: number;
  phone?: string;
  subjects?: string[];
  schoolName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentProfession?: string;
  joinedAt?: any;
}

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.get<any>(`/students/${user.uid}`);
      const student = response.student || response;
      setProfile(student);
    } catch (error: any) {
      showToast(error.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return '-';
    const timestamp = dateObj._seconds ? dateObj._seconds * 1000 : new Date(dateObj).getTime();
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile not found</h3>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Unable to load your profile information</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><User size={40} className="text-purple-600" />My Profile</h1>
        <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>View your personal information</p>
      </div>

      {/* Profile Card */}
      <div className={`rounded-xl shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        {/* Banner */}
        <div className="bg-gradient-to-r from-gray-400 to-gray-600 h-32"></div>
        
        {/* Avatar & Name */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-12">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 shadow-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700 border-gray-700' : 'bg-white border-white'}`}>
              <span className="text-4xl sm:text-5xl font-bold text-green-600">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-6 sm:mb-2">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.name}</h2>
              <p className="text-green-600 font-medium">
                {profile.board} - Standard {profile.standard}
              </p>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className={`rounded-lg p-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Mail className="w-5 h-5 mr-2 text-green-600" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.email}</p>
              </div>
              {profile.phone && (
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Academic Info */}
          <div className={`rounded-lg p-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <School className="w-5 h-5 mr-2 text-green-600" />
              Academic Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Board</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.board}</p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Standard</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.standard}</p>
              </div>
              {profile.schoolName && (
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>School</p>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.schoolName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subjects */}
          {profile.subjects && profile.subjects.length > 0 && (
            <div className={`rounded-lg p-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                Enrolled Subjects
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.subjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Parent Info */}
          {profile.parentName && (
            <div className={`rounded-lg p-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Parent/Guardian
              </h3>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.parentName}</p>
                </div>
                {profile.parentPhone && (
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.parentPhone}</p>
                  </div>
                )}
                {profile.parentEmail && (
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.parentEmail}</p>
                  </div>
                )}
                {profile.parentProfession && (
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profession</p>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.parentProfession}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {profile.joinedAt && (
          <div className={`px-6 py-4 border-t ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Member since {formatDate(profile.joinedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
