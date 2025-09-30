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
  ChevronDownIcon,
  BarsArrowUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CubeIcon,
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
    current: boolean;
  }[];
}

type SortOption = 'newest' | 'orderNumber' | 'totalPrice' | 'customerName' | 'status';
type SortOrder = 'asc' | 'desc';

export default function TrackingPage() {
  // CSS анимации для процесса доставки
  const deliveryAnimations = `
    @keyframes slideInFromLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 5px rgba(147, 51, 234, 0.3);
      }
      50% {
        box-shadow: 0 0 20px rgba(147, 51, 234, 0.6), 0 0 30px rgba(147, 51, 234, 0.4);
      }
    }
    
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-3px);
      }
      60% {
        transform: translateY(-2px);
      }
    }
    
    .delivery-step {
      animation: slideInFromLeft 0.5s ease-out;
    }
    
    .delivery-step:nth-child(1) { animation-delay: 0.1s; }
    .delivery-step:nth-child(2) { animation-delay: 0.2s; }
    .delivery-step:nth-child(3) { animation-delay: 0.3s; }
    .delivery-step:nth-child(4) { animation-delay: 0.4s; }
    .delivery-step:nth-child(5) { animation-delay: 0.5s; }
    
    .current-step {
      animation: glow 2s ease-in-out infinite, bounce 2s ease-in-out infinite;
    }
    
    .completed-step {
      animation: fadeInUp 0.3s ease-out;
    }
  `;
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState(false);

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
        console.log('Orders with statuses:', data.orders.map((order: any) => ({ id: order.id, status: order.status })));
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
              price: Number(item.price) || 0,
              variant: {
                id: item.id,
                size: item.size || 'N/A',
                color: item.color || 'N/A',
                sku: item.sku || '',
                price: Number(item.price) || 0,
                discountPrice: item.discountPrice ? Number(item.discountPrice) : undefined,
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

          // Рассчитываем итоговую сумму из товаров, если totalPrice не задан или равен 0
          let calculatedTotalPrice = Number(order.totalPrice) || 0;
          if (calculatedTotalPrice === 0 && normalizedItems.length > 0) {
            calculatedTotalPrice = normalizedItems.reduce((sum: number, item: any) => {
              const itemPrice = (Number(item.price) || 0) * (Number(item.quantity) || 0);
              return sum + itemPrice;
            }, 0);
          }

          return {
            ...order,
            totalPrice: calculatedTotalPrice,
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
    const orderDate = new Date(createdAt);
    const allSteps = [
      {
        status: 'CREATED',
        timestamp: createdAt,
        description: 'Заказ создан и принят в обработку',
        completed: status === 'CREATED' || status === 'COURIER_WAIT' || status === 'COURIER_PICKED' || status === 'ENROUTE' || status === 'DELIVERED',
        current: status === 'CREATED'
      },
      {
        status: 'COURIER_WAIT',
        timestamp: new Date(orderDate.getTime() + 30 * 60000).toISOString(),
        description: 'Ожидает курьера',
        completed: status === 'COURIER_PICKED' || status === 'ENROUTE' || status === 'DELIVERED',
        current: status === 'COURIER_WAIT'
      },
      {
        status: 'COURIER_PICKED',
        timestamp: new Date(orderDate.getTime() + 2 * 60 * 60000).toISOString(),
        description: 'Курьер забрал заказ',
        completed: status === 'ENROUTE' || status === 'DELIVERED',
        current: status === 'COURIER_PICKED'
      },
      {
        status: 'ENROUTE',
        timestamp: new Date(orderDate.getTime() + 3 * 60 * 60000).toISOString(),
        description: 'В пути к получателю',
        completed: status === 'DELIVERED',
        current: status === 'ENROUTE'
      },
      {
        status: 'DELIVERED',
        timestamp: new Date(orderDate.getTime() + 4 * 60 * 60000).toISOString(),
        description: 'Заказ доставлен получателю',
        completed: status === 'DELIVERED',
        current: status === 'DELIVERED'
      }
    ];

    // Если заказ отменен, добавляем специальный шаг
    if (status === 'CANCELED') {
      return [
        {
          status: 'CREATED',
          timestamp: createdAt,
          description: 'Заказ создан и принят в обработку',
          completed: true,
          current: false
        },
        {
          status: 'CANCELED',
          timestamp: new Date(orderDate.getTime() + 1 * 60 * 60000).toISOString(),
          description: 'Заказ отменен',
          completed: true,
          current: true
        }
      ];
    }

    return allSteps;
  };

  const getCurrentStatus = (order: Order) => {
    const steps = order.trackingSteps || [];
    const currentStep = steps.find(step => step.current);
    return currentStep || steps[steps.length - 1];
  };

  const getStatusIcon = (status: string, completed: boolean, isCurrent: boolean = false) => {
    if (isCurrent) {
      switch (status) {
        case 'CREATED':
          return <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <ClockIcon className="h-4 w-4 text-white" />
          </div>;
        case 'COURIER_WAIT':
          return <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <UserIcon className="h-4 w-4 text-white" />
          </div>;
        case 'COURIER_PICKED':
          return <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <TruckIcon className="h-4 w-4 text-white" />
          </div>;
        case 'ENROUTE':
          return <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <TruckIcon className="h-4 w-4 text-white" />
          </div>;
        case 'DELIVERED':
          return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircleIcon className="h-4 w-4 text-white" />
          </div>;
        case 'CANCELED':
          return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <XMarkIcon className="h-4 w-4 text-white" />
          </div>;
        default:
          return <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
            <ClockIcon className="h-4 w-4 text-white" />
          </div>;
      }
    }

    if (!completed) {
      return <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center opacity-50">
        <ClockIcon className="h-4 w-4 text-gray-500" />
      </div>;
    }

    switch (status) {
      case 'CREATED':
        return <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
          <ClockIcon className="h-4 w-4 text-white" />
        </div>;
      case 'COURIER_WAIT':
        return <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
          <UserIcon className="h-4 w-4 text-white" />
        </div>;
      case 'COURIER_PICKED':
        return <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
          <TruckIcon className="h-4 w-4 text-white" />
        </div>;
      case 'ENROUTE':
        return <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
          <TruckIcon className="h-4 w-4 text-white" />
        </div>;
      case 'DELIVERED':
        return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>;
      case 'CANCELED':
        return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
          <XMarkIcon className="h-4 w-4 text-white" />
        </div>;
      default:
        return <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
          <ClockIcon className="h-4 w-4 text-white" />
        </div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Создан';
      case 'COURIER_WAIT': return 'Ожидает курьера';
      case 'COURIER_PICKED': return 'Курьер забрал';
      case 'ENROUTE': return 'В пути';
      case 'DELIVERED': return 'Доставлен';
      case 'CANCELED': return 'Отменен';
      default: return status;
    }
  };

  const formatPrice = (price: number | string | undefined) => {
    if (!price || isNaN(Number(price))) {
      return '0 сом';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0,
    }).format(Number(price));
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

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
    setShowOrderModal(false);
    setExpandedDelivery(false);
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
      <style dangerouslySetInnerHTML={{ __html: deliveryAnimations }} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-xl p-8 border border-gray-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                <TruckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Трекинг доставки</h1>
                <p className="text-gray-300 text-lg">Отслеживания заказов</p>
              </div>
            </div>

            {/* Order Statistics */}
            <div className="hidden lg:flex items-start space-x-6">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Created Orders */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Созданы:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
                    {allOrders.filter(order => order.status === 'CREATED').length}
                  </span>
                </div>

                {/* Waiting for Courier */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Ожидает курьера:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
                    {allOrders.filter(order => order.status === 'COURIER_WAIT').length}
                  </span>
                </div>

                {/* Courier Picked */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <TruckIcon className="w-4 h-4 text-orange-400" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Курьер забрал:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
                    {allOrders.filter(order => order.status === 'COURIER_PICKED').length}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* In Transit */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">В пути:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
                    {allOrders.filter(order => order.status === 'SHIPPED').length}
                  </span>
                </div>

                {/* Delivered */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Доставлен:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
                    {allOrders.filter(order => order.status === 'DELIVERED').length}
                  </span>
                </div>

                {/* Cancelled */}
                <div className="flex items-center justify-between w-48">
                  <div className="flex items-center space-x-2">
                    <XMarkIcon className="w-4 h-4 text-red-500" />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Отменен:</span>
                  </div>
                  <span className="text-white font-semibold text-sm w-8 text-right">
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
              {/* Created Orders */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-400">Созданы</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'CREATED').length}
                </div>
              </div>

              {/* Waiting for Courier */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-400">Ожидает курьера</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'COURIER_WAIT').length}
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

              {/* Courier Picked */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <TruckIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-400">Курьер забрал</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'COURIER_PICKED').length}
                </div>
              </div>

              {/* Delivered */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-400">Доставлен</span>
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {allOrders.filter(order => order.status === 'DELIVERED').length}
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
              <div className="grid gap-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => openOrderModal(order)}
                    className="bg-gradient-to-r from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-lg border border-gray-700/40 p-4 hover:border-orange-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 group cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center">
                        {order.status === 'DELIVERED' ? (
                          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : order.status === 'COURIER_PICKED' ? (
                          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <TruckIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : order.status === 'CREATED' ? (
                          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                            <ClockIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : order.status === 'COURIER_WAIT' ? (
                          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : order.status === 'ENROUTE' ? (
                          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                            <TruckIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : order.status === 'CANCELED' ? (
                          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                            <XMarkIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                            <ShoppingBagIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-sm font-semibold truncate mb-1">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, index) => (
                              <span key={item.id}>
                                {item.variant?.product?.name || 'Товар без названия'}
                                {index < order.items.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">Нет товаров</span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-xs font-mono">
                          #{String(order.orderNumber || order.id).slice(-6)}
                        </p>
                        </div>

                      {/* Price and Quantity */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-yellow-300 text-sm font-semibold">
                          {formatPrice(order.totalPrice)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {order.items?.length || 0} шт.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl ring-1 ring-white/5 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <TruckIcon className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Детали заказа</h2>
                  <p className="text-gray-300 text-xs font-mono">#{String(selectedOrder.orderNumber || selectedOrder.id).slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={closeOrderModal}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="text-base font-semibold text-white mb-3 flex items-center">
                  <ShoppingBagIcon className="h-4 w-4 text-orange-400 mr-2" />
                  Товары в заказе
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                      <div key={item.id} className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-xs mb-1">
                              {item.variant?.product?.name || 'Товар без названия'}
                            </h4>
                            <div className="flex items-center space-x-3 text-xs text-gray-300">
                              <span>Кол-во: {item.quantity}</span>
                              <span>Цена: {formatPrice(item.price)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-300 font-semibold text-xs">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <ShoppingBagIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-xs">Нет товаров в заказе</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-400 mr-2" />
                  Итоговая сумма
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Общая сумма:</span>
                  <span className="text-yellow-300 font-semibold text-base">
                    {formatPrice(selectedOrder.totalPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-300 text-sm">Количество товаров:</span>
                  <span className="text-white font-medium text-sm">
                    {selectedOrder.items?.length || 0} шт.
                  </span>
                </div>
              </div>

              {/* Delivery Process */}
              <div>
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4 p-3 rounded-lg bg-gradient-to-r from-gray-800/40 to-gray-700/40 hover:from-gray-700/50 hover:to-gray-600/50 transition-all duration-300 group"
                  onClick={() => setExpandedDelivery(!expandedDelivery)}
                >
                  <h3 className="text-lg font-bold text-white flex items-center group-hover:text-purple-200 transition-colors duration-300">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                      <MapPinIcon className="h-5 w-5 text-white" />
                    </div>
                    Процесс доставки
                  </h3>
                  <div className="flex items-center space-x-3">
                    {selectedOrder.trackingSteps && selectedOrder.trackingSteps.length > 0 && (
                      <div className="flex items-center space-x-3 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
                        {getStatusIcon(getCurrentStatus(selectedOrder).status, getCurrentStatus(selectedOrder).completed, getCurrentStatus(selectedOrder).current)}
                        <span className="text-white text-sm font-semibold">
                          {getStatusText(getCurrentStatus(selectedOrder).status)}
                        </span>
                      </div>
                    )}
                    <div className="p-2 bg-gray-700/50 rounded-lg group-hover:bg-purple-500/20 transition-colors duration-300">
                      <ChevronDownIcon 
                        className={`h-5 w-5 text-gray-400 group-hover:text-purple-300 transition-all duration-300 ${
                          expandedDelivery ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </div>
                </div>

                {expandedDelivery && (
                  <div className="space-y-4 overflow-hidden">
                    {selectedOrder.trackingSteps && selectedOrder.trackingSteps.length > 0 ? (
                      selectedOrder.trackingSteps.map((step, index) => (
                        <div 
                          key={index} 
                          className={`delivery-step flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                            step.current 
                              ? 'current-step bg-gradient-to-r from-purple-500/30 via-blue-500/20 to-purple-500/30 border-2 border-purple-400/50 shadow-xl' 
                              : step.completed 
                                ? 'completed-step bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-600/40 shadow-md' 
                                : 'bg-gray-800/30 border border-gray-700/30 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(step.status, step.completed, step.current)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold ${
                                step.current 
                                  ? 'text-white bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent' 
                                  : step.completed 
                                    ? 'text-gray-200' 
                                    : 'text-gray-400'
                              }`}>
                                {getStatusText(step.status)}
                              </p>
                              {step.current && (
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-purple-300 font-medium">Активно</span>
                                </div>
                              )}
                            </div>
                            <p className={`text-sm mt-2 leading-relaxed ${
                              step.current 
                                ? 'text-gray-200' 
                                : step.completed 
                                  ? 'text-gray-300' 
                                  : 'text-gray-500'
                            }`}>
                              {step.description}
                            </p>
                            {step.completed && (
                              <div className="mt-2 flex items-center space-x-1">
                                <CheckCircleIcon className="h-3 w-3 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Завершено</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ClockIcon className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-sm font-medium">Информация о доставке недоступна</p>
                        <p className="text-xs text-gray-500 mt-1">Попробуйте обновить страницу</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t border-gray-700/50">
              <button
                onClick={closeOrderModal}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
