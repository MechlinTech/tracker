import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { User, LogOut, Settings, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';

interface UserMenuProps {
  className?: string;
  setIsPasswordModalOpen: Dispatch<SetStateAction<boolean>>;
}

export default function UserMenu({ className, setIsPasswordModalOpen }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  useEffect(() => {
    fetchUserName();
  }, []);

  async function fetchUserName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserName(profile.full_name);
        }
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`relative hidden lg:block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {userName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <span className="text-sm font-medium">{userName}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <Key className="h-4 w-4 mr-3" />
                  Change Password
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 