'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserIcon,
  PhoneIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  BarsArrowUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  variant: {
    id: string;
    size: string;
    color: string;
    sku: string;
    price: number;
    discountPrice?: number;
    mainImage?: string;
    product: {
      name: string;
      category: {
        name: string;
      };
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  customerAddress?: string;
  items: OrderItem[];
  trackingSteps?: {
    status: string;
    timestamp: string;
    description: string;
    completed: boolean;
  }[];
}

type SortOption = 'newest' | 'orderNumber' | 'totalPrice' | 'customerName' | 'status';
type SortOrder = 'asc' | 'desc';

export default function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [timeFromFilter, setTimeFromFilter] = useState<string>('00:00');
  const [timeToFilter, setTimeToFilter] = useState<string>('23:59');
  const [showDateTimeFrom, setShowDateTimeFrom] = useState(false);
  const [showDateTimeTo, setShowDateTimeTo] = useState(false);

  // Refs для инпутов даты и времени
  const dateFromInputRef = useRef<HTMLInputElement>(null);
  const timeFromInputRef = useRef<HTMLInputElement>(null);
  const dateToInputRef = useRef<HTMLInputElement>(null);
  const timeToInputRef = useRef<HTMLInputElement>(null);

  // Состояние для всех заказов без фильтрации по поиску
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, sortBy, sortOrder, dateFromFilter, dateToFilter, timeFromFilter, timeToFilter]);

  // Отдельный useEffect для фильтрации по поиску
  useEffect(() => {
    if (searchTerm.trim()) {
      const filteredOrders = allOrders.filter(order => 
        order.items?.some(item => 
          item.variant?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setOrders(filteredOrders);
    } else {
      setOrders(allOrders);
    }
  }, [searchTerm, allOrders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        console.error('Токен не найден в localStorage');
        return;
      }
      
      // Формируем параметры фильтрации
      const dateFromString = dateFromFilter ? getDateTimeString(dateFromFilter, timeFromFilter) : null;
      const dateToString = dateToFilter ? getDateTimeString(dateToFilter, timeToFilter) : null;
      
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy,
        sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFromString && { dateFrom: dateFromString }),
        ...(dateToString && { dateTo: dateToString }),
      });
      
      const response = await fetch(`/api/admin/orders?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Добавляем мок данные для трекинга и нормализуем структуру данных
        const ordersWithTracking = data.orders.map((order: any) => {
          // Нормализуем структуру items - поддерживаем и orderItems, и items
          let normalizedItems = [];
          if (order.items) {
            normalizedItems = order.items;
          } else if (order.orderItems) {
            // Преобразуем orderItems в формат items
            normalizedItems = order.orderItems.map((item: any) => ({
              id: item.id,
              quantity: item.amount || item.quantity || 1,
              price: item.price,
              variant: {
                id: item.id,
                size: item.size || 'N/A',
                color: item.color || 'N/A',
                sku: item.sku || '',
                price: item.price,
                discountPrice: item.discountPrice,
                mainImage: item.mainImage || null,
                product: {
                  name: item.product?.name || 'Без названия',
                  category: {
                    name: item.product?.category?.name || 'Без категории'
                  }
                }
              }
            }));
          }

          return {
            ...order,
            items: normalizedItems,
            trackingSteps: generateTrackingSteps(order.status, order.createdAt)
          };
        });

        // Сохраняем все заказы
        setAllOrders(ordersWithTracking);
      } else {
        const errorData = await response.text();
        console.error('Ошибка загрузки заказов:', response.status, response.statusText, errorData);
        
        // Если ошибка авторизации, возможно токен истек
        if (response.status === 401) {
          console.log('Токен истек или невалиден, перезагружаем страницу');
          // Можно перенаправить на логин или обновить токен
          // window.location.href = '/admin/login';
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrackingSteps = (status: string, createdAt: string) => {
    const baseSteps = [
      {
        status: 'CREATED',
        timestamp: createdAt,
        description: 'Заказ создан и принят в обработку',
        completed: true
      }
    ];

    const orderDate = new Date(createdAt);

    if (status === 'PAID' || status === 'SHIPPED' || status === 'COMPLETED') {
      baseSteps.push({
        status: 'PAID',
        timestamp: new Date(orderDate.getTime() + 30 * 60000).toISOString(),
        description: 'Заказ оплачен',
        completed: true
      });
    }

    if (status === 'SHIPPED' || status === 'COMPLETED') {
      baseSteps.push({
        status: 'SHIPPED',
        timestamp: new Date(orderDate.getTime() + 2 * 60 * 60000).toISOString(),
        description: 'Заказ отправлен',
        completed: true
      });
    }

    if (status === 'COMPLETED') {
      baseSteps.push({
        status: 'COMPLETED',
        timestamp: new Date(orderDate.getTime() + 4 * 60 * 60000).toISOString(),
        description: 'Заказ доставлен получателю',
        completed: true
      });
    }

    if (status === 'CANCELLED') {
      baseSteps.push({
        status: 'CANCELLED',
        timestamp: new Date(orderDate.getTime() + 1 * 60 * 60000).toISOString(),
        description: 'Заказ отменен',
        completed: true
      });
    }

    return baseSteps;
  };

  const getStatusIcon = (status: string, completed: boolean) => {
    if (!completed) {
      return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }

    switch (status) {
      case 'CREATED':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'PAID':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'SHIPPED':
        return <TruckIcon className="h-5 w-5 text-orange-500" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'CANCELLED':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Создан';
      case 'PAID': return 'Оплачен';
      case 'SHIPPED': return 'Отправлен';
      case 'COMPLETED': return 'Доставлен';
      case 'CANCELLED': return 'Отменен';
      default: return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Функции для работы с датами
  const formatDateTimeForDisplay = (date: string, time: string) => {
    if (!date) return 'Выберите дату';
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    const dateObj = new Date(`${date}T${timeWithSeconds}`);
    
    if (isNaN(dateObj.getTime())) {
      return 'Неверная дата';
    }
    
    return dateObj.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateTimeString = (date: string, time: string) => {
    if (!date) return '';
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    return `${date}T${timeWithSeconds}`;
  };

  const setQuickDateRange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        setDateFromFilter(today);
        setDateToFilter(today);
        setTimeFromFilter('00:00');
        setTimeToFilter('23:59');
        break;
      case 'yesterday':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setDateFromFilter(yesterday);
        setDateToFilter(yesterday);
        setTimeFromFilter('00:00');
        setTimeToFilter('23:59');
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setDateFromFilter(weekAgo);
        setDateToFilter(today);
        setTimeFromFilter('00:00');
        setTimeToFilter('23:59');
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
        setDateFromFilter(monthAgo);
        setDateToFilter(today);
        setTimeFromFilter('00:00');
        setTimeToFilter('23:59');
        break;
    }
  };

  // Очистка фильтров
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setTimeFromFilter('00:00');
    setTimeToFilter('23:59');
    setShowDateTimeFrom(false);
    setShowDateTimeTo(false);
  };

  // Обработка кликов вне элементов
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.date-time-dropdown')) {
        setShowDateTimeFrom(false);
        setShowDateTimeTo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-xl p-8 border border-gray-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                <TruckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Заказы</h1>
                <p className="text-gray-300 text-lg">Управление заказами клиентов</p>
              </div>
            </div>

            {/* Order Statistics */}
            <div className="hidden lg:flex items-start space-x-6">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Today Orders */}
                <div className="flex items-center justify-between w-40">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-400 text-sm">Сегодня:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => {
                      const today = new Date().toDateString();
                      const orderDate = new Date(order.createdAt).toDateString();
                      return orderDate === today;
                    }).length}
                  </span>
                </div>

                {/* Waiting for Courier */}
                <div className="flex items-center justify-between w-44">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Ожидает курьера:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => order.status === 'PENDING' || order.status === 'PAID').length}
                  </span>
                </div>

                {/* Courier Accepted */}
                <div className="flex items-center justify-between w-40">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Курьер принял:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => order.status === 'PROCESSING').length}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* In Transit */}
                <div className="flex items-center justify-between w-32">
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">В пути:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => order.status === 'SHIPPED').length}
                  </span>
                </div>

                {/* Delivered */}
                <div className="flex items-center justify-between w-32">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Доставлен:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => order.status === 'DELIVERED' || order.status === 'COMPLETED').length}
                  </span>
                </div>

                {/* Cancelled */}
                <div className="flex items-center justify-between w-32">
                  <div className="flex items-center space-x-2">
                    <XMarkIcon className="w-4 h-4 text-red-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Отменен:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">
                    {allOrders.filter(order => order.status === 'CANCELLED').length}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600/50 ml-4">
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Всего</div>
                  <div className="text-white font-bold text-lg">
                    {allOrders.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Statistics */}
          <div className="lg:hidden mt-8 pt-6 border-t border-gray-600/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Today Orders */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-400">Сегодня</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => {
                    const today = new Date().toDateString();
                    const orderDate = new Date(order.createdAt).toDateString();
                    return orderDate === today;
                  }).length}
                </div>
              </div>

              {/* Waiting for Courier */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-400">Ожидает курьера</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'PENDING' || order.status === 'PAID').length}
                </div>
              </div>

              {/* Courier Accepted */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Курьер принял</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'PROCESSING').length}
                </div>
              </div>

              {/* In Transit */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-400">В пути</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'SHIPPED').length}
                </div>
              </div>

              {/* Delivered */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-400">Доставлен</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'DELIVERED' || order.status === 'COMPLETED').length}
                </div>
              </div>

              {/* Cancelled */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <XMarkIcon className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-400">Отменен</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'CANCELLED').length}
                </div>
              </div>

              {/* Total */}
              <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30 col-span-2 sm:col-span-1">
                <div className="text-center">
                  <div className="text-sm text-orange-300">Всего</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {allOrders.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
          <div className="space-y-4">
            {/* Search - Full width on mobile */}
            <div className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                 <input
                   type="text"
                   placeholder="Поиск по названию товара..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="block w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 text-sm sm:text-base"
                 />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                  </button>
                )}
              </div>
            </div>

            {/* Controls Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-3">
                {/* Sort Controls */}
                <div className="flex items-center space-x-2">
                  <div className="min-w-[200px]">
                    <div className="flex items-center space-x-2 bg-gray-700/30 border border-gray-600/50 rounded-lg px-3 py-3">
                      <BarsArrowUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer min-w-0 flex-1"
                      >
                        <option value="newest" className="bg-gray-800">По дате</option>
                        <option value="totalPrice" className="bg-gray-800">По сумме</option>
                        <option value="customerName" className="bg-gray-800">По клиенту</option>
                        <option value="status" className="bg-gray-800">По статусу</option>
                      </select>
                      <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>

                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all duration-200 flex-shrink-0 ${
                      sortOrder === 'desc'
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:border-gray-500/50 hover:text-gray-300'
                    }`}
                    title={sortOrder === 'desc' ? 'По убыванию' : 'По возрастанию'}
                  >
                    {sortOrder === 'desc' ? (
                      <ArrowDownIcon className="h-4 w-4" />
                    ) : (
                      <ArrowUpIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Status Filter */}
                <div className="min-w-[180px]">
                  <div className="flex items-center space-x-2 bg-gray-700/30 border border-gray-600/50 rounded-lg px-3 py-3">
                    <CheckCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer min-w-0 flex-1"
                    >
                      <option value="all" className="bg-gray-800">Все статусы</option>
                      <option value="PENDING" className="bg-gray-800">В ожидании</option>
                      <option value="PAID" className="bg-gray-800">Оплачен</option>
                      <option value="SHIPPED" className="bg-gray-800">Отправлен</option>
                      <option value="COMPLETED" className="bg-gray-800">Завершен</option>
                      <option value="CANCELLED" className="bg-gray-800">Отменен</option>
                    </select>
                    <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div className="space-y-3">
                {/* Top Row: Quick Date Buttons and Clear Button */}
                <div className="flex items-center justify-between gap-3">
                  {/* Quick Date Range Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setQuickDateRange('today')}
                      className="px-3 py-1.5 text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-all duration-200"
                    >
                      Сегодня
                    </button>
                    <button
                      onClick={() => setQuickDateRange('yesterday')}
                      className="px-3 py-1.5 text-xs bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                    >
                      Вчера
                    </button>
                    <button
                      onClick={() => setQuickDateRange('week')}
                      className="px-3 py-1.5 text-xs bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-500/30 transition-all duration-200"
                    >
                      Неделя
                    </button>
                    <button
                      onClick={() => setQuickDateRange('month')}
                      className="px-3 py-1.5 text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all duration-200"
                    >
                      Месяц
                    </button>
                  </div>

                  {/* Clear All Filters Button */}
                  {(searchTerm || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-1.5 bg-gray-600/30 border border-gray-600/50 rounded-lg text-gray-300 hover:bg-gray-600/50 transition-colors text-xs whitespace-nowrap"
                    >
                      Очистить фильтры
                    </button>
                  )}
                </div>

                {/* Bottom Row: Date Range */}
                <div className="flex gap-2">
                  {/* From Date */}
                  <div className="flex-1 relative date-time-dropdown">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDateTimeFrom(!showDateTimeFrom);
                      }}
                      className={`w-full flex items-center space-x-2 bg-gray-700/30 border border-gray-600/50 rounded-lg px-3 py-3 hover:bg-gray-700/40 transition-all duration-200 cursor-pointer ${
                        dateFromFilter ? 'ring-1 ring-orange-500/50 border-orange-500/50' : ''
                      }`}
                    >
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium flex-1 text-left">
                        {dateFromFilter ? formatDateTimeForDisplay(dateFromFilter, timeFromFilter) : 'От даты'}
                      </span>
                      <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </button>

                  {/* Dropdown для "От даты" */}
                  {showDateTimeFrom && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 z-50 date-time-dropdown">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4 text-orange-400" />
                          Выберите дату и время
                        </h3>
                        <button
                          onClick={() => setShowDateTimeFrom(false)}
                          className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">Дата</label>
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => {
                              if (dateFromInputRef.current) {
                                dateFromInputRef.current.focus();
                                dateFromInputRef.current.showPicker?.();
                              }
                            }}
                          >
                            <input
                              ref={dateFromInputRef}
                              type="date"
                              value={dateFromFilter}
                              onChange={(e) => setDateFromFilter(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:bg-gray-800/80"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">Время</label>
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => {
                              if (timeFromInputRef.current) {
                                timeFromInputRef.current.focus();
                                timeFromInputRef.current.showPicker?.();
                              }
                            }}
                          >
                            <input
                              ref={timeFromInputRef}
                              type="time"
                              value={timeFromFilter}
                              onChange={(e) => setTimeFromFilter(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:bg-gray-800/80"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowDateTimeFrom(false)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-600 hover:to-red-600 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Применить
                        </button>
                        <button
                          onClick={() => {
                            setDateFromFilter('');
                            setTimeFromFilter('00:00');
                            setShowDateTimeFrom(false);
                          }}
                          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-xl transition-all duration-200 border border-red-500/30"
                        >
                          Очистить
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                  {/* To Date */}
                  <div className="flex-1 relative date-time-dropdown">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDateTimeTo(!showDateTimeTo);
                      }}
                      className={`w-full flex items-center space-x-2 bg-gray-700/30 border border-gray-600/50 rounded-lg px-3 py-3 hover:bg-gray-700/40 transition-all duration-200 cursor-pointer ${
                        dateToFilter ? 'ring-1 ring-orange-500/50 border-orange-500/50' : ''
                      }`}
                    >
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium flex-1 text-left">
                        {dateToFilter ? formatDateTimeForDisplay(dateToFilter, timeToFilter) : 'До даты'}
                      </span>
                      <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </button>

                  {/* Dropdown для "До даты" */}
                  {showDateTimeTo && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 z-50 date-time-dropdown">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4 text-orange-400" />
                          Выберите дату и время
                        </h3>
                        <button
                          onClick={() => setShowDateTimeTo(false)}
                          className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">Дата</label>
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => {
                              if (dateToInputRef.current) {
                                dateToInputRef.current.focus();
                                dateToInputRef.current.showPicker?.();
                              }
                            }}
                          >
                            <input
                              ref={dateToInputRef}
                              type="date"
                              value={dateToFilter}
                              onChange={(e) => setDateToFilter(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:bg-gray-800/80"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">Время</label>
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => {
                              if (timeToInputRef.current) {
                                timeToInputRef.current.focus();
                                timeToInputRef.current.showPicker?.();
                              }
                            }}
                          >
                            <input
                              ref={timeToInputRef}
                              type="time"
                              value={timeToFilter}
                              onChange={(e) => setTimeToFilter(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:bg-gray-800/80"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowDateTimeTo(false)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-600 hover:to-red-600 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Применить
                        </button>
                        <button
                          onClick={() => {
                            setDateToFilter('');
                            setTimeToFilter('23:59');
                            setShowDateTimeTo(false);
                          }}
                          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-xl transition-all duration-200 border border-red-500/30"
                        >
                          Очистить
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                </div>
              </div>
            </div>

            {/* Results Info */}
            <div className="pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-400">
                  <div className="flex items-center space-x-2">
                    <ShoppingBagIcon className="h-4 w-4" />
                    <span>Показано {orders.length} из {allOrders.length}</span>
                  </div>
                  {searchTerm && (
                    <div className="flex items-center space-x-2 text-orange-400">
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      <span>Поиск: "{searchTerm}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500/30"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent absolute top-0"></div>
                </div>
                <p className="text-gray-400 mt-4">Загружаем заказы...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-700/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <TruckIcon className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Нет активных заказов</h3>
                <p className="text-gray-500">У вас пока нет заказов для отслеживания</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6 hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-6 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-400">Заказ от {new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-white text-sm">{order.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-white text-sm">{order.customerPhone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-white text-sm font-medium">{formatPrice(order.totalPrice)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                          order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          order.status === 'SHIPPED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          <span className="w-4 h-4 flex-shrink-0 mr-2">
                            {getStatusIcon(order.status, true)}
                          </span>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Tracking Timeline */}
                    <div className="border-t border-gray-700/30 pt-6">
                      <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center">
                        <TruckIcon className="h-4 w-4 mr-2" />
                        Статус доставки
                      </h4>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-orange-500 to-gray-600"></div>
                        <div className="space-y-4">
                          {order.trackingSteps?.map((step, index) => (
                            <div key={index} className="relative flex items-start space-x-4">
                              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                step.completed 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30' 
                                  : 'bg-gray-700 border-2 border-gray-600'
                              }`}>
                                {step.completed ? (
                                  <CheckCircleIcon className="h-4 w-4 text-white" />
                                ) : (
                                  <ClockIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <p className={`text-sm font-medium ${
                                    step.completed ? 'text-white' : 'text-gray-500'
                                  }`}>
                                    {step.description}
                                  </p>
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {new Date(step.timestamp).toLocaleString('ru-RU', { 
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer with Product Names and Order Number */}
                    <div className="border-t border-gray-700/30 pt-4 mt-6">
                      <div className="space-y-2">
                        {/* Product Names */}
                        <div className="flex flex-wrap gap-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, index) => (
                              <span key={item.id} className="text-white font-medium text-sm">
                                {item.variant?.product?.name || 'Товар без названия'}
                                {index < order.items.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">Нет товаров</span>
                          )}
                        </div>
                        {/* Order Number */}
                        <div className="text-gray-400 text-xs">
                          {order.orderNumber || order.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
