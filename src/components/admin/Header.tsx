'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  UserIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export default function Header() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userData, setUserData] = useState<{fullname?: string, phoneNumber?: string} | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Получаем данные пользователя из localStorage
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserData(user);
      } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error);
      }
    }
  }, []);

  // Закрытие меню при клике вне его области
  const handleClickOutside = () => {
    setIsProfileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700/50 h-16 flex items-center justify-between px-4 lg:px-6 shadow-lg backdrop-blur-sm relative z-50">
      {/* Logo and Brand */}
      <div className="flex items-center">
        {/* Logo */}
        <div className="w-12 h-12 relative sm:mr-4 rounded-lg flex items-center justify-center">
          <img src="/seller-icon.ico" alt="Store Seller Logo" className="w-12 h-12 rounded-lg" />
        </div>
        
        {/* Brand text - только desktop */}
        <div className="hidden sm:block ml-0">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-sm">
            
          </h1>
          <div className="flex items-center space-x-1 -mt-1">
            <p className="text-xs text-indigo-300 font-medium">Seller Panel</p>
          </div>
        </div>
        
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">

        {/* Quick Stats */}
        <div className="hidden lg:flex items-center space-x-4 mr-2">
          <div className="flex items-center space-x-2 bg-gray-800/60 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300 font-medium">Online</span>
          </div>
        </div>
        

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center space-x-2 text-gray-300 hover:text-white bg-gray-700/60 hover:bg-gray-600/80 backdrop-blur-sm px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group border border-gray-600/30"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <UserIcon className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:block">{userData?.fullname || 'Продавец'}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={handleClickOutside}
              />
              <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-2xl bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 z-[70] overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-b border-gray-600/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{userData?.fullname || 'Продавец'}</div>
                      <div className="text-xs text-gray-400">{userData?.phoneNumber || 'Номер не указан'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all duration-200 group"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-400 group-hover:text-red-300 transition-colors duration-200" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </header>
  );
}
