import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Lock, Bell, Eye, EyeOff, Smartphone, LogOut, AlertCircle, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import { pushNotifications } from '../services/pushNotifications';

interface SettingsData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  publicProfile: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
  [key: string]: any;
}

const Settings: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'privacy'>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    publicProfile: false,
    twoFactorAuth: false,
    sessionTimeout: '30',
  });
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [currentPasswordFromBackend, setCurrentPasswordFromBackend] = useState('');
  const [showBackendPassword, setShowBackendPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Load settings and current password on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get<any>('/users/settings');
        // API returns {ok: true, settings: {...}}, so access the nested settings
        const settingsData = response.settings || response;
        
        console.log('⚙️ Loading settings data:', settingsData);
        
        if (response && response.ok !== false) {
          setSettings(prev => ({
            ...prev,
            emailNotifications: settingsData.emailNotifications ?? true,
            pushNotifications: settingsData.pushNotifications ?? false,
            weeklyDigest: settingsData.weeklyDigest ?? true,
            publicProfile: settingsData.publicProfile ?? false,
            twoFactorAuth: settingsData.twoFactorAuth ?? false,
            sessionTimeout: settingsData.sessionTimeout ?? '30',
          }));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    const loadCurrentPassword = async () => {
      try {
        console.log('🔐 Fetching current password from backend...');
        const response = await api.get<any>('/users/current-password');
        console.log('📥 Password response:', response);
        
        if (response && response.password !== undefined) {
          if (response.password === '') {
            setCurrentPasswordFromBackend('[Not set - Please change password once]');
            console.log('⚠️ Password field is empty in database');
          } else {
            setCurrentPasswordFromBackend(response.password);
            console.log('✅ Current password loaded successfully');
          }
        } else {
          setCurrentPasswordFromBackend('[Unable to load]');
          console.error('❌ Invalid response format:', response);
        }
      } catch (error) {
        console.error('❌ Failed to load current password:', error);
        setCurrentPasswordFromBackend('[Error loading password]');
      }
    };
    
    loadSettings();
    loadCurrentPassword();
  }, []);

  const handleToggle = async (key: string) => {
    const newValue = !settings[key];
    
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    // Handle push notification permission
    if (key === 'pushNotifications' && newValue) {
      try {
        // Register service worker first
        await pushNotifications.registerServiceWorker();
        
        // Request permission
        const permission = await pushNotifications.requestPermission();
        
        if (permission !== 'granted') {
          // User denied permission, revert the toggle
          setSettings(prev => ({
            ...prev,
            pushNotifications: false
          }));
          alert('⚠️ Browser notification permission denied. Please enable it in your browser settings to receive push notifications.');
          return;
        }
        
        // Subscribe to push notifications
        const subscription = await pushNotifications.subscribe();
        console.log('✅ Push notification subscription:', subscription);
        
        alert('✅ Push notifications enabled! You will now receive browser notifications.');
      } catch (error) {
        console.error('❌ Failed to enable push notifications:', error);
        setSettings(prev => ({
          ...prev,
          pushNotifications: false
        }));
        alert('❌ Failed to enable push notifications. Please check your browser settings.');
      }
    } else if (key === 'pushNotifications' && !newValue) {
      // User disabled push notifications
      try {
        await pushNotifications.unsubscribe();
        console.log('✅ Unsubscribed from push notifications');
      } catch (error) {
        console.error('❌ Failed to unsubscribe:', error);
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const payload = {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        weeklyDigest: settings.weeklyDigest,
        publicProfile: settings.publicProfile,
        twoFactorAuth: settings.twoFactorAuth,
        sessionTimeout: settings.sessionTimeout,
      };
      console.log('📤 Sending settings update:', payload);
      const response = await api.put('/users/settings', payload);
      console.log('✅ Settings update response:', response);
      
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.current) {
      alert('Please enter your current password!');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.new.length < 8) {
      alert('New password must be at least 8 characters long!');
      return;
    }
    if (passwordData.current === passwordData.new) {
      alert('New password must be different from current password!');
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      };
      console.log('📤 Sending password change request');
      const response = await api.post('/users/change-password', payload);
      console.log('✅ Password change response:', response);
      
      // Reload the current password display to show the new password
      try {
        const pwdResponse = await api.get<any>('/users/current-password');
        if (pwdResponse && pwdResponse.password) {
          setCurrentPasswordFromBackend(pwdResponse.password);
          console.log('🔄 Current password display updated');
        }
      } catch (err) {
        console.error('Failed to reload password display:', err);
      }
      
      alert('✅ Password updated successfully!');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('❌ Error updating password:', error);
      alert('Failed to update password. Please check your current password is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <SettingsIcon className="text-blue-600" size={36} />
          Settings
        </h1>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your account preferences and security</p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-4 border-b overflow-x-auto ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          { id: 'account', label: 'Account', icon: SettingsIcon },
          { id: 'security', label: 'Security', icon: Lock },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <div className={`rounded-xl shadow-sm border p-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Settings</h2>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</label>
              <input
                type="email"
                value="shrutigaikwad8766@gmail.com"
                disabled
                className={`w-full px-4 py-2 border rounded-lg cursor-not-allowed ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              />
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Contact support to change email</p>
            </div>

            {/* Session Timeout */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Timeout</label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="never">Never</option>
              </select>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time until automatic logout for security</p>
            </div>

            {/* Active Sessions */}
            <div>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Smartphone size={18} className="text-blue-600" />
                Active Sessions
              </h3>
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chrome on Windows</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last active: Just now</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">Active</span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mobile Safari on iPhone</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last active: 2 hours ago</p>
                  </div>
                  <button className="text-xs text-red-600 hover:text-red-700">Logout</button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>

            {showSaveMessage && (
              <div className={`flex items-center gap-2 p-4 rounded-lg border ${isDarkMode ? 'bg-green-900 border-green-700 text-green-300' : 'bg-green-50 border-green-200 text-green-800'}`}>
                <Check size={18} />
                Settings saved successfully!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className={`rounded-xl shadow-sm border p-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Security Settings</h2>

          <div className="space-y-6">
            {/* Change Password */}
            <div>
              <h3 className={`font-semibold mb-6 flex items-center gap-2 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Lock size={20} className="text-red-600" />
                Change Password
              </h3>
              <div className="space-y-4">
                {/* Current Password Display */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center gap-2">
                      Current Password
                      <span className={`text-xs font-normal ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(View only)</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showBackendPassword ? 'text' : 'password'}
                      value={currentPasswordFromBackend}
                      disabled
                      className={`w-full px-4 py-2 border rounded-lg cursor-not-allowed pr-12 font-mono ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowBackendPassword(!showBackendPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                      title={showBackendPassword ? 'Hide password' : 'Show password'}
                    >
                      {showBackendPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className={`text-xs mt-2 flex items-start gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>This is your current password stored in the system. Click the eye icon to reveal it.</span>
                  </p>
                </div>
                
                {/* Verify Current Password */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verify Current Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="current"
                      value={passwordData.current}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-2 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="new"
                      value={passwordData.new}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-2 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm"
                      value={passwordData.confirm}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-2 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Update Button */}
                <button
                  onClick={handleUpdatePassword}
                  disabled={isLoading}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium w-full"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className={`border-t pt-6 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Smartphone size={18} className="text-blue-600" />
                    Two-Factor Authentication
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={() => handleToggle('twoFactorAuth')}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    settings.twoFactorAuth ? 'bg-blue-600' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.twoFactorAuth ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Security Alert */}
            <div className={`rounded-lg p-4 flex items-start gap-3 border ${isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
              <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} size={20} />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>Keep Your Password Safe</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>Never share your password with anyone. We will never ask you for your password.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className={`rounded-xl shadow-sm border p-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notification Preferences</h2>

          <div className="space-y-4">
            {[
              {
                id: 'emailNotifications',
                label: 'Email Notifications',
                description: 'Receive updates via email',
              },
              {
                id: 'pushNotifications',
                label: 'Push Notifications',
                description: 'Get browser notifications',
              },
              {
                id: 'weeklyDigest',
                label: 'Weekly Digest',
                description: 'Receive a weekly summary of activity',
              },
            ].map(notif => (
              <div key={notif.id} className={`flex items-center justify-between p-4 border rounded-lg transition ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{notif.label}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{notif.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(notif.id)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    settings[notif.id as keyof typeof settings] ? 'bg-blue-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings[notif.id as keyof typeof settings] ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}

            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default Settings;
