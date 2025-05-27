import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Clock,
  Users,
  Camera,
  Settings,
  LogOut,
  Calendar,
  FileText,
  ChevronDown,
  Menu
} from 'lucide-react';
import Notifications from './Notifications';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: Clock },
    { name: 'Time Tracker', path: '/time-tracker', icon: Clock },
    { name: 'Team', path: '/team', icon: Users, show: user?.role === 'manager' || user?.role === 'admin' },
    { name: 'Screenshots', path: '/screenshots', icon: Camera, show: user?.role !== 'hr' },
    { name: 'Leave', path: '/leave', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'HR Management', path: '/hr', icon: Users, show: user?.role === 'hr' },
    { name: 'Admin', path: '/admin', icon: Settings, show: user?.role === 'admin' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 glass-panel border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 py-2">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center space-x-2 bg-primary-50 px-4 py-2 rounded-xl">
                  <Clock className="h-6 w-6 text-primary-600" />
                  <span className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                    TimeTracker Pro
                  </span>
                </div>
              </div>
              <div className="hidden lg:ml-8 lg:flex lg:space-x-3">
                {navigation.map((item) => 
                  (item.show === undefined || item.show) && (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-link ${isActive(item.path) ? 'nav-link-active' : 'nav-link-inactive'}`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4 px-2">
              <button 
                onClick={handleLogout} 
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-200 ml-8"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block ml-2">Logout</span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-surface-50 rounded-xl">
                  <span className="text-sm font-medium text-surface-900">{user?.full_name}</span>
                  <ChevronDown className="h-4 w-4 text-surface-500" />
                </div>
                <Notifications />
              </div>
              <button
                className="lg:hidden btn-ghost p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) =>
                (item.show === undefined || item.show) && (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActive(item.path) ? 'nav-link-active' : 'nav-link-inactive'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="mt-auto glass-panel border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500">
              © {new Date().getFullYear()} TimeTracker Pro. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-surface-500 hover:text-surface-900">Privacy</a>
              <a href="#" className="text-sm text-surface-500 hover:text-surface-900">Terms</a>
              <a href="#" className="text-sm text-surface-500 hover:text-surface-900">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}