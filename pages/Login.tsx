
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { LoginResponse } from '../types';
import { Loader2, GraduationCap, Users, BookOpen, TrendingUp, Award, CheckCircle, Moon, Sun } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && savedPassword && savedRemember) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post<any>('/login', { email, password }, false);
      
      // Handle both response formats
      const loginData: LoginResponse = {
        ok: response.success || response.ok,
        message: response.message || 'Login successful',
        sessionId: response.sessionId,
        user: response.user
      };
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
        localStorage.setItem('savedPassword', password);
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Clear saved credentials if remember me is unchecked
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
      }
      
      login(loginData);
      showToast('Login successful!');
      
      console.log('User logged in:', loginData.user);
      
      // Navigate based on user role
      if (loginData.user.role === 'student') {
        console.log('Redirecting to student dashboard');
        navigate('/student/dashboard');
      } else {
        console.log('Redirecting to teacher/admin dashboard');
        navigate('/dashboard');
      }
    } catch (error: any) {
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Left Side - Informative Section */}
      <div className={`hidden lg:flex lg:w-1/2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-12 flex-col justify-between relative overflow-hidden`}>
        {/* Divider Line */}
        <div className={`absolute right-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent ${isDarkMode ? 'via-blue-500' : 'via-blue-300'} to-transparent`}></div>

        {/* Logo - Top Left Corner */}
        <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
          <img src="/logo4.png" alt="Sneha Maths" className="w-45 h-auto object-contain" style={{ width: '70px' }} />
          <div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Sneha's</h1>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Maths Expert Classes</p>
          </div>
        </div>

        <div className="relative z-10 mt-16">

          {/* Main Heading */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold mb-3 leading-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Your Expert Math Mentor<br />for Every Board & Level!
            </h2>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Expert offline math coaching from Grade 6 to Engineering (JEE/NEET)
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 p-2 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold text-base ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Customized Coaching</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} leading-relaxed`}>Personalized learning paths for all boards (SSC, CBSE, ICSE, IGCSE, IB)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-indigo-500 p-2 rounded-lg flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold text-base ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Clear Understanding</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} leading-relaxed`}>Strong fundamentals with concept clarity and exam success</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold text-base ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Confidence Boost</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} leading-relaxed`}>Enhanced logical thinking, speed, and problem-solving accuracy</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-blue-200'}`}>
              <Users className={`w-7 h-7 mx-auto mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>500+</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students</div>
            </div>
            <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-blue-200'}`}>
              <BookOpen className={`w-7 h-7 mx-auto mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>50+</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Batches</div>
            </div>
            <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-blue-200'}`}>
              <GraduationCap className={`w-7 h-7 mx-auto mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`} />
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>98%</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Success Rate</div>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10">
          <p className={`text-base italic ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
            "Don't be afraid to give up the good to go for the great"
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="w-full max-w-md">
          {/* Dark Mode Toggle - Top Right */}
          <button
            onClick={toggleDarkMode}
            className={`absolute top-6 right-6 p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-yellow-400 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/logo1.png" alt="Sneha Maths" className="h-12 w-12 object-contain" />
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Sneha Maths</h1>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Expert Classes</p>
            </div>
          </div>

          <div className={`rounded-2xl shadow-xl p-8 md:p-10 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white'}`}>
            <div className="mb-8">
              <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Welcome Back</h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Enter your password"
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="rememberMe" className={`text-sm font-medium cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Logging in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Institute Management System
              </p>
              <p className={`text-center text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Manage students, teachers, batches, and more
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
