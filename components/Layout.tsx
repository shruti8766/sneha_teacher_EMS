import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  PenTool
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, onClick }: any) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100'
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Layout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

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
          fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 flex flex-col
        `}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
              <span className="text-xl font-bold text-gray-800">Sneha EMS</span>
           </div>
           <button onClick={closeMenu} className="md:hidden text-gray-500">
             <X size={24} />
           </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={closeMenu} />
          <SidebarLink to="/students" icon={Users} label="Students" onClick={closeMenu} />
          <SidebarLink to="/teachers" icon={GraduationCap} label="Teachers" onClick={closeMenu} />
          <SidebarLink to="/batches" icon={BookOpen} label="Batches" onClick={closeMenu} />
          <SidebarLink to="/homework" icon={PenTool} label="Homework" onClick={closeMenu} />
          <SidebarLink to="/fees" icon={CreditCard} label="Fees" onClick={closeMenu} />
          <SidebarLink to="/tests" icon={ClipboardList} label="Tests" onClick={closeMenu} />
          {/* Placeholder links for other features */}
          <SidebarLink to="/attendance" icon={CalendarCheck} label="Attendance" onClick={closeMenu} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="font-semibold text-gray-800 capitalize">
            {location.pathname.replace('/', '')}
          </div>
          <button onClick={toggleMenu} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;