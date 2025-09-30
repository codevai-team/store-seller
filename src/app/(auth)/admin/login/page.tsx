'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float-slow"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:60px_60px] animate-grid"></div>
        
        {/* Particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center animate-slide-down">
            <div className="relative inline-block">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform hover:scale-110 transition-all duration-500 group">
                <LockClosedIcon className="h-10 w-10 text-white group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <SparklesIcon className="h-4 w-4 text-yellow-800" />
              </div>
            </div>
            
            <h1 className="text-4xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-4 animate-fade-in">
              Добро пожаловать
            </h1>
            <p className="text-blue-100 text-lg font-medium animate-fade-in-delayed">
              Войдите в панель администратора
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-slide-up">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Phone Input */}
              <div className="space-y-3">
                <label htmlFor="login" className="block text-sm font-semibold text-blue-100">
                  Номер телефона
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-blue-300 group-focus-within:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <input
                    id="login"
                    name="login"
                    type="tel"
                    required
                    className="block w-full pl-12 pr-4 py-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm group-hover:bg-white/30"
                    placeholder="Введите номер телефона"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <label htmlFor="password" className="block text-sm font-semibold text-blue-100">
                  Пароль
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-blue-300 group-focus-within:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full pl-12 pr-12 py-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm group-hover:bg-white/30"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-300 hover:text-white focus:outline-none transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
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
                className="w-full relative group flex justify-center items-center py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-indigo-500/25 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
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
                      <span className="mr-2">Войти</span>
                      <SparklesIcon className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center animate-fade-in-delayed">
            <p className="text-blue-200 text-sm font-medium">
              Store Seller Admin Panel
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-180deg); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(90deg); }
        }

        @keyframes grid {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        @keyframes particle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
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

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }

        .animate-grid {
          animation: grid 20s linear infinite;
        }

        .animate-particle {
          animation: particle 3s ease-in-out infinite;
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