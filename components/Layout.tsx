import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useDetail } from '../context/DetailContext';
import NotificationCenter from './NotificationCenter';
import SearchBar from './SearchBar';
import UserProfileCard from './UserProfileCard';
import DarkModeToggle from './DarkModeToggle';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CalendarCheck, 
  CreditCard,
  Menu,
  LogOut,
  X,
  PenTool,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  BookText,
  Calendar as CalendarIcon,
  Moon,
  Sun,
  ArrowLeft,
  Video
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, onClick, isCollapsed, isDarkMode, showDetail, detailName }: any) => (
  <div>
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 flex-shrink-0 group relative ${
          isActive
            ? isDarkMode
              ? 'bg-gradient-to-r from-blue-400/30 to-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10 border border-blue-400/20'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200'
            : isDarkMode
            ? 'text-gray-400 hover:bg-gray-700 hover:text-blue-400'
            : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600'
        } ${isCollapsed ? 'justify-center px-2' : ''}`
      }
      title={isCollapsed ? label : ''}
    >
      <Icon size={20} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
      {!isCollapsed && <span className="font-medium truncate">{label}</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40">
          {label}
        </div>
      )}
    </NavLink>
    
    {/* Show detail name with arrow if this is the active category and we're on a detail page */}
    {showDetail && detailName && !isCollapsed && (
      <div className={`flex items-center gap-2 px-4 py-2 ml-4 text-sm transition-all duration-300 ${
        isDarkMode
          ? 'text-blue-300'
          : 'text-blue-600'
      }`}>
        <span className="text-lg">→</span>
        <span className="truncate">{detailName}</span>
      </div>
    )}
  </div>
);

const Layout: React.FC = () => {
  const { logout, user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { detailName, detailType } = useDetail();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const goToProfile = () => {
    navigate('/profile');
    closeMenu();
  };

  // Check if detail view is active for the current category
  const isStudentDetail = location.pathname.includes('/students/') && detailType === 'student';
  const isTeacherDetail = location.pathname.includes('/teachers/') && detailType === 'teacher';
  const isBatchDetail = location.pathname.includes('/batches/') && detailType === 'batch';

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-20 bg-transparent transition-all duration-300 ease-out flex flex-col p-2
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${isCollapsed ? 'md:w-32' : 'md:w-72'}
          w-72
        `}
      >
        {/* Sidebar Container with Light Gray Background */}
        <div className={`flex-1 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
          {/* Logo Section with Creative Design */}
          <div className={`relative border-b bg-gradient-to-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700 from-gray-700 to-gray-800' : 'border-gray-300 from-gray-150 to-gray-100'}`}>
           <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isCollapsed ? 'p-2 gap-0.5' : 'p-3 gap-1'}`}>
              {/* Logo Container with Gradient Background */}
              <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-14 h-14'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg opacity-15 blur-sm"></div>
                <img 
                  src="/logo.png" 
                  alt="Sneha EMS Logo" 
                  className={`relative w-full h-full object-contain drop-shadow-md transition-all duration-300 hover:scale-105`} 
                />
              </div>
              
              {/* Logo Text */}
              {!isCollapsed && (
                <div className="text-center">
                  <h1 className="text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    SNEHA
                  </h1>
                  <p className="text-xs text-gray-500 font-medium tracking-wider leading-none">EMS</p>
                </div>
              )}
           </div>
           
           {/* Close & Collapse Buttons */}
           <button onClick={closeMenu} className="absolute top-2 right-2 md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
             <X size={16} />
           </button>
           <button 
             onClick={toggleCollapse} 
             className="absolute top-2 right-2 hidden md:flex p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
             title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
           >
             {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
           </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {/* Main Navigation Group */}
          {!isCollapsed && <div className={`text-xs font-bold uppercase tracking-widest px-2 py-2 mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Core</div>}
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/students" icon={Users} label="Students" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} showDetail={isStudentDetail} detailName={detailName} />
          {user?.role !== 'teacher' && (
            <SidebarLink to="/teachers" icon={GraduationCap} label="Teachers" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} showDetail={isTeacherDetail} detailName={detailName} />
          )}
          
          {/* Divider */}
          <div className={`my-3 mx-2 h-px bg-gradient-to-r ${isDarkMode ? 'from-gray-700 via-gray-600 to-gray-700' : 'from-gray-200 via-gray-300 to-gray-200'}`}></div>
          
          {/* Academic & Management Group */}
          {!isCollapsed && <div className={`text-xs font-bold uppercase tracking-widest px-2 py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Academic</div>}
          <SidebarLink to="/batches" icon={BookOpen} label="Batches" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} showDetail={isBatchDetail} detailName={detailName} />
          <SidebarLink to="/attendance" icon={CalendarCheck} label="Attendance" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/timetable" icon={CalendarIcon} label="Timetable" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/meetings" icon={Video} label="Meetings" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/materials" icon={BookText} label="Syllabus" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/homework" icon={PenTool} label="Homework" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          <SidebarLink to="/tests" icon={ClipboardList} label="Tests" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          
          {/* Divider - Only show for admin/staff */}
          {user?.role !== 'teacher' && (
            <div className={`my-3 mx-2 h-px bg-gradient-to-r ${isDarkMode ? 'from-gray-700 via-gray-600 to-gray-700' : 'from-gray-200 via-gray-300 to-gray-200'}`}></div>
          )}
          
          {/* Finance & Communication Group - Only show for admin/staff */}
          {user?.role !== 'teacher' && (
            <>
              {!isCollapsed && <div className={`text-xs font-bold uppercase tracking-widest px-2 py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Operations</div>}
              <SidebarLink to="/fees" icon={CreditCard} label="Fees" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
              <SidebarLink to="/analytics" icon={BarChart3} label="Analytics" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
            </>
          )}
          
          {/* Messages - Available for all roles */}
          {(user?.role !== 'teacher' || user?.role === 'teacher') && (
            <SidebarLink to="/messages" icon={MessageSquare} label="Messages" onClick={closeMenu} isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
          )}
          
          {/* Empty space for future pages */}
          <div className="flex-1"></div>
        </nav>

        <div className={`p-3 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-700 bg-gradient-to-t from-gray-700 to-gray-800' : 'border-gray-100 bg-gradient-to-t from-blue-50 to-white'}`}>
          {!isCollapsed && (
            <button
              onClick={goToProfile}
              className={`w-full text-left mb-3 px-3 py-1.5 rounded-lg border transition-all duration-300 group text-sm ${
                isDarkMode
                  ? 'bg-gradient-to-r from-gray-700 to-gray-600 border-gray-600 hover:from-gray-600 hover:to-gray-500 hover:border-gray-500'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300'
              }`}
            >
              <p className={`text-xs font-bold transition-colors ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-700'}`}>{user?.name}</p>
              <p className={`text-xs capitalize font-medium transition-colors ${isDarkMode ? 'text-gray-400 group-hover:text-blue-300' : 'text-gray-500 group-hover:text-blue-600'}`}>{user?.role}</p>
            </button>
          )}
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm ${
              isDarkMode
                ? 'text-red-400 hover:bg-red-900 hover:text-red-300'
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden">
        <header className={`border-b p-4 pr-6 flex items-center justify-between sticky top-0 z-40 gap-4 transition-colors duration-300 rounded-2xl m-2 mb-0 mr-2 overflow-visible ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Back Button - Shows on detail pages */}
          {location.pathname.includes('detail') || location.pathname.includes('Detail') ? (
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDarkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
              }`}
              title="Go back"
            >
              <ArrowLeft size={22} />
            </button>
          ) : null}

          <div className={`font-semibold capitalize md:hidden flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {location.pathname.replace('/', '').replace('detail', '').replace('Detail', '') || 'Dashboard'}
          </div>
          
          {/* Search Bar - Hidden on mobile, visible on tablet+ */}
          <div className="hidden sm:block flex-1 max-w-md overflow-visible">
            <SearchBar />
          </div>
          
          <div className={`flex items-center gap-4 ml-auto`}>
            {/* Dark Mode Toggle */}
            <DarkModeToggle />
            <span className={`h-6 w-px mx-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
            <UserProfileCard />
            <span className={`h-6 w-px mx-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
            <NotificationCenter />
            <button onClick={toggleMenu} className={`md:hidden p-2 rounded-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Menu size={24} />
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto scrollbar-hide px-2 md:px-3 py-2 md:py-3 m-2 transition-all duration-500 relative ${
          isDarkMode
            ? 'bg-gradient-to-b from-gray-800/50 via-gray-900/20 to-gray-900'
            : 'bg-gradient-to-b from-blue-50/40 via-gray-50/80 to-gray-50'
        }`}>
          {/* Smooth overlay effect from header to content */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
            isDarkMode
              ? 'bg-gradient-radial-to-b from-blue-500/5 via-transparent to-transparent'
              : 'bg-gradient-radial-to-b from-blue-400/8 via-transparent to-transparent'
          }`}></div>
          
          <div className="animate-fade-in rounded-2xl relative z-10">
            <Outlet />
          </div>
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .bg-gradient-radial-to-b {
          background: radial-gradient(ellipse at center top, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default Layout;