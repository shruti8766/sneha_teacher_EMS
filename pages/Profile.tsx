import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { User, Mail, Phone, Building2, Calendar, Shield, Edit2, Check, X, Loader2 } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  department: string;
  institution: string;
  [key: string]: any;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMessage, setShowMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [formData, setFormData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    department: '',
    institution: '',
  });

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get<any>('/users/profile');
        // API returns {ok: true, profile: {...}}, so access the nested profile
        const profileData = response.profile || response;
        
        console.log('📚 Loading profile data:', profileData);
        
        if (response && response.ok !== false) {
          setFormData({
            name: profileData.name || user?.name || '',
            email: profileData.email || user?.email || '',
            phone: profileData.phone || '',
            department: profileData.department || '',
            institution: profileData.institution || '',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        institution: formData.institution,
      };
      console.log('📤 Sending profile update:', payload);
      const response = await api.put('/users/profile', payload);
      console.log('✅ Profile update response:', response);
      
      setMessageType('success');
      setShowMessage('Profile updated successfully!');
      setIsEditing(false);
      
      // Reload profile to verify changes were saved
      const apiResponse = await api.get<any>('/users/profile');
      console.log('📥 Reloaded profile:', apiResponse);
      
      // API returns {ok: true, profile: {...}}, so access the nested profile
      const updatedProfile = apiResponse.profile || apiResponse;
      
      setFormData({
        name: updatedProfile.name || formData.name,
        email: updatedProfile.email || formData.email,
        phone: updatedProfile.phone || formData.phone,
        department: updatedProfile.department || formData.department,
        institution: updatedProfile.institution || formData.institution,
      });
      
      // Update Auth context with new user data
      console.log('🔄 Updating Auth context with:', {
        name: updatedProfile.name,
        phone: updatedProfile.phone,
        department: updatedProfile.department,
        institution: updatedProfile.institution,
      });
      updateUser({
        name: updatedProfile.name,
        phone: updatedProfile.phone,
        department: updatedProfile.department,
        institution: updatedProfile.institution,
      });
      
      setTimeout(() => setShowMessage(''), 3000);
    } catch (error) {
      setMessageType('error');
      setShowMessage('Failed to update profile. Please try again.');
      console.error('❌ Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-600';
      case 'teacher':
        return 'bg-blue-600';
      case 'student':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <User className="text-blue-600" size={36} />
          My Profile
        </h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Edit2 size={18} />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Success Message */}
      {showMessage && (
        <div className={`p-4 rounded-lg ${messageType === 'success' ? isDarkMode ? 'bg-green-900 text-green-200 border-green-700' : 'bg-green-50 text-green-800 border-green-200' : isDarkMode ? 'bg-red-900 text-red-200 border-red-700' : 'bg-red-50 text-red-800 border-red-200'} border`}>
          {showMessage}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className={`rounded-xl shadow-sm p-8 flex items-center justify-center h-64 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <>
      {/* Profile Card */}
      <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="p-8">
          {/* Avatar Section */}
          <div className={`flex items-start gap-6 mb-8 pb-8 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className={`w-24 h-24 rounded-full ${getRoleColor(user?.role)} flex items-center justify-center text-white text-4xl font-bold flex-shrink-0`}>
              {getInitials(user?.name)}
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.name}</h2>
              <p className={`capitalize mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {user?.role === 'admin' && '👨‍💼 Administrator'}
                {user?.role === 'teacher' && '👨‍🏫 Teacher'}
                {user?.role === 'student' && '👨‍🎓 Student'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className={`w-3 h-3 rounded-full ${getRoleColor(user?.role)}`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active</span>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <User size={18} className="text-purple-600" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-900'} border`}
                />
              ) : (
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Mail size={18} className="text-blue-600" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-900'} border`}
                />
              ) : (
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Phone size={18} className="text-green-600" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-900'} border`}
                />
              ) : (
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.phone}</p>
              )}
            </div>

            {/* Institution */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Building2 size={18} className="text-orange-600" />
                Institution
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-900'} border`}
                />
              ) : (
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.institution}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Building2 size={18} className="text-purple-600" />
                Department
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 bg-white text-gray-900'} border`}
                />
              ) : (
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.department}</p>
              )}
            </div>

            {/* Join Date */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Calendar size={18} className="text-indigo-600" />
                Member Since
              </label>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>January 15, 2024</p>
            </div>

            {/* Status */}
            <div>
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Shield size={18} className="text-red-600" />
                Account Status
              </label>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Active</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className={`flex items-center gap-3 mt-8 pt-8 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

        </>
      )}
    </div>
  );
};

export default Profile;
