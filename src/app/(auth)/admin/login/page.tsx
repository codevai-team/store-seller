'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

export default function AdminLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Аутентификация
      const authResponse = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.message || 'Ошибка аутентификации');
      }

      if (!authData.success || !authData.token) {
        throw new Error('Неверный ответ от сервера');
      }

      // Сохраняем токен в localStorage и cookies
      localStorage.setItem('adminToken', authData.token);
      localStorage.setItem('adminUser', JSON.stringify(authData.user));
      
      // Устанавливаем cookie для middleware
      document.cookie = `admin_token=${authData.token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 дней

      // Перенаправляем сразу на dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center animate-slide-down">
            <div className="relative inline-block">
              <div className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform hover:scale-110 transition-all duration-500 group">
                <img src="/seller-icon.ico" alt="Store Seller Logo" className="w-24 h-24 rounded-3xl group-hover:scale-105 transition-transform duration-300" />
              </div>
          </div>
            
            <h1 className="text-4xl font-black bg-gradient-to-r from-white via-purple-100 to-indigo-200 bg-clip-text text-transparent mb-4 animate-fade-in">
              Добро пожаловать
            </h1>
            <p className="text-purple-100 text-lg font-medium animate-fade-in-delayed">
              Войдите в панель продовца
          </p>
        </div>
        
          {/* Login Form */}
          <div className="bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 animate-slide-up">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Phone Input */}
              <div className="space-y-3">
                <label htmlFor="login" className="block text-sm font-semibold text-purple-100">
                Номер телефона
              </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-purple-300 group-focus-within transition-colors duration-300" style={{ color: '#8341FD' }} />
                  </div>
                <input
                  id="login"
                  name="login"
                  type="tel"
                  required
                    className="block w-full pl-12 pr-4 py-4 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
                    style={{ 
                      '--tw-ring-color': '#8341FD',
                      backgroundColor: '#111827 !important',
                      borderColor: '#374151 !important',
                      border: '1px solid #374151 !important'
                    } as React.CSSProperties}
                    placeholder="Введите номер телефона"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(131, 65, 253, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' }}></div>
              </div>
            </div>
            
              {/* Password Input */}
              <div className="space-y-3">
                <label htmlFor="password" className="block text-sm font-semibold text-purple-100">
                Пароль
              </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-purple-300 group-focus-within transition-colors duration-300" style={{ color: '#8341FD' }} />
                  </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                    className="block w-full pl-12 pr-12 py-4 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
                    style={{ 
                      '--tw-ring-color': '#8341FD',
                      backgroundColor: '#111827 !important',
                      borderColor: '#374151 !important',
                      border: '1px solid #374151 !important'
                    } as React.CSSProperties}
                    placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-purple-300 hover:text-white focus:outline-none transition-colors duration-300"
                >
                  {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(131, 65, 253, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' }}></div>
            </div>
          </div>

              {/* Error Message */}
          {error && (
                <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm p-4 rounded-2xl backdrop-blur-sm animate-shake">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3 animate-pulse"></div>
              {error}
                  </div>
            </div>
          )}

              {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
                className="w-full relative group flex justify-center items-center py-4 px-6 text-white font-bold rounded-2xl shadow-2xl transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 overflow-hidden hover:shadow-purple-500/25"
                style={{ 
                  background: 'linear-gradient(135deg, #8341FD 0%, #8B5CF6 50%, #A855F7 100%)',
                  boxShadow: '0 25px 50px -12px rgba(131, 65, 253, 0.25)',
                  '--tw-ring-color': '#8341FD'
                } as React.CSSProperties}
            >
                <div className="absolute inset-0 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, #8341FD 0%, #8B5CF6 50%, #A855F7 100%)' }}></div>
                <div className="relative flex items-center">
              {isLoading ? (
                    <>
                <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                      Вход...
                    </>
              ) : (
                    <>
                      <span>Войти</span>
                    </>
              )}
                </div>
            </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center animate-fade-in-delayed">
            <p className="text-purple-200 text-sm font-medium">
              Store Seller Panel
            </p>
            </div>
          </div>
        </div>

      <style jsx global>{`
        /* Force dark input styles */
        input[type="tel"], input[type="password"], input[type="text"] {
          background-color: #111827 !important;
          border-color: #374151 !important;
          border: 1px solid #374151 !important;
          color: white !important;
        }
        
        input[type="tel"]:focus, input[type="password"]:focus, input[type="text"]:focus {
          background-color: #111827 !important;
          border-color: #8341FD !important;
          box-shadow: 0 0 0 2px rgba(131, 65, 253, 0.2) !important;
        }
        
        input[type="tel"]:hover, input[type="password"]:hover, input[type="text"]:hover {
          background-color: #1f2937 !important;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-delayed {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s both;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out 0.4s both;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 1s ease-out 0.6s both;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}