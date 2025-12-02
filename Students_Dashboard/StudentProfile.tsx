import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
        <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Profile not found</h3>
        <p className="text-gray-600">Unable to load your profile information</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your personal information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 h-32"></div>
        
        {/* Avatar & Name */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-12">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-4xl sm:text-5xl font-bold text-green-600">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-6 sm:mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-green-600 font-medium">
                {profile.board} - Standard {profile.standard}
              </p>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-green-600" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile.email}</p>
              </div>
              {profile.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{profile.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Academic Info */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <School className="w-5 h-5 mr-2 text-green-600" />
              Academic Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Board</p>
                <p className="font-medium text-gray-900">{profile.board}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Standard</p>
                <p className="font-medium text-gray-900">{profile.standard}</p>
              </div>
              {profile.schoolName && (
                <div>
                  <p className="text-sm text-gray-500">School</p>
                  <p className="font-medium text-gray-900">{profile.schoolName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subjects */}
          {profile.subjects && profile.subjects.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                Enrolled Subjects
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.subjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Parent Info */}
          {profile.parentName && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Parent/Guardian
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{profile.parentName}</p>
                </div>
                {profile.parentPhone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{profile.parentPhone}</p>
                  </div>
                )}
                {profile.parentEmail && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile.parentEmail}</p>
                  </div>
                )}
                {profile.parentProfession && (
                  <div>
                    <p className="text-sm text-gray-500">Profession</p>
                    <p className="font-medium text-gray-900">{profile.parentProfession}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {profile.joinedAt && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Member since {formatDate(profile.joinedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
