import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  CalendarCheck, 
  CreditCard,
  Menu,
  LogOut,
  X,
  MessageSquare,
  FileText,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, onClick, isCollapsed }: any) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 flex-shrink-0 ${
        isActive
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100'
      } ${isCollapsed ? 'justify-center px-2' : ''}`
    }
    title={isCollapsed ? label : ''}
  >
    <Icon size={20} className="flex-shrink-0" />
    {!isCollapsed && <span className="font-medium truncate">{label}</span>}
  </NavLink>
);

const StudentLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-30 bg-white border-r border-gray-200 shadow-sm transform transition-all duration-300 ease-out flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          w-64
        `}
      >
        {/* Header */}
        <div className="relative border-b border-gray-100 bg-white">
           <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
              <img 
                src="/logo.png" 
                alt="Student Portal Logo" 
                className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'}`} 
              />
           </div>
           <button onClick={closeMenu} className="absolute top-2 right-2 md:hidden text-gray-500 hover:text-gray-700">
             <X size={20} />
           </button>
           <button 
             onClick={toggleCollapse} 
             className="absolute top-2 right-2 hidden md:block p-1 text-gray-500 hover:text-gray-700 transition-colors"
             title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
           >
             {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
           </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Main Navigation Group */}
          <SidebarLink to="/student/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={closeMenu} isCollapsed={isCollapsed} />
          
          {/* Divider */}
          <div className="my-2 mx-2 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
          
          {/* Academic Group */}
          <SidebarLink to="/student/homework" icon={BookOpen} label="My Homework" onClick={closeMenu} isCollapsed={isCollapsed} />
          <SidebarLink to="/student/tests" icon={ClipboardList} label="Tests & Results" onClick={closeMenu} isCollapsed={isCollapsed} />
          <SidebarLink to="/student/attendance" icon={CalendarCheck} label="Attendance" onClick={closeMenu} isCollapsed={isCollapsed} />
          
          {/* Divider */}
          <div className="my-2 mx-2 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
          
          {/* Finance & Communication Group */}
          <SidebarLink to="/student/fees" icon={CreditCard} label="Fee Details" onClick={closeMenu} isCollapsed={isCollapsed} />
          <SidebarLink to="/student/messages" icon={MessageSquare} label="Messages" onClick={closeMenu} isCollapsed={isCollapsed} />
          <SidebarLink to="/student/profile" icon={User} label="My Profile" onClick={closeMenu} isCollapsed={isCollapsed} />
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-100">
          {!isCollapsed && (
            <div className="mb-4 px-4">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-green-600 capitalize font-medium">Student</p>
            </div>
          )}
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-4">
          <div className="font-semibold text-gray-800 capitalize md:hidden">
            {getPageTitle()}
          </div>
          
          {/* Search Bar - Hidden on mobile, visible on tablet+ */}
          <div className="hidden sm:block flex-1 max-w-md">
            <SearchBar />
          </div>
          
          <button onClick={toggleMenu} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLayout;
