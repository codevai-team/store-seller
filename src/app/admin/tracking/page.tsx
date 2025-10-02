'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useToast } from '@/hooks/useToast';

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

type SortOption = 'date' | 'totalPrice' | 'status';
type SortOrder = 'asc' | 'desc';

export default function TrackingPage() {
  const { showError, showSuccess } = useToast();
  
  // Минимальные CSS анимации
  const deliveryAnimations = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .delivery-step {
      animation: fadeIn 0.3s ease-out;
    }
    
    /* Mobile overflow prevention */
    @media (max-width: 640px) {
      .mobile-container {
        max-width: 100vw;
        overflow-x: hidden;
        padding: 0.5rem;
      }
      
      .mobile-card {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      /* Compact mobile styles */
      .mobile-stats-grid {
        gap: 0.375rem !important;
      }
      
      .mobile-stats-card {
        padding: 0.5rem !important;
      }
      
      .mobile-stats-text {
        font-size: 0.75rem !important;
        line-height: 1rem !important;
      }
      
      .mobile-stats-number {
        font-size: 1rem !important;
        line-height: 1.25rem !important;
        margin-top: 0.25rem !important;
      }
      
      /* Compact date picker modal */
      .date-time-dropdown {
        padding: 0.75rem !important;
        border-radius: 1rem !important;
        max-width: calc(100vw - 2rem) !important;
        width: 100% !important;
      }
      
      .date-time-dropdown .grid {
        grid-template-columns: 1fr !important;
        gap: 0.5rem !important;
      }
      
      .date-time-dropdown input {
        padding: 0.375rem 0.5rem !important;
        font-size: 0.75rem !important;
        border-radius: 0.5rem !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      .date-time-dropdown button {
        padding: 0.5rem 0.75rem !important;
        font-size: 0.75rem !important;
        border-radius: 0.5rem !important;
      }
      
      .date-time-dropdown .flex {
        flex-direction: column !important;
        gap: 0.5rem !important;
      }
      
      .date-time-dropdown .flex button {
        width: 100% !important;
      }
      
      /* Extra small screens */
      @media (max-width: 375px) {
        .date-time-dropdown {
          padding: 0.5rem !important;
          margin: 0.5rem !important;
          max-width: calc(100vw - 1.5rem) !important;
        }
        
        .date-time-dropdown input {
          padding: 0.25rem 0.375rem !important;
          font-size: 0.7rem !important;
        }
        
        .date-time-dropdown button {
          padding: 0.375rem 0.5rem !important;
          font-size: 0.7rem !important;
        }
        
        .date-time-dropdown h3 span {
          font-size: 0.7rem !important;
        }
        
        .date-time-dropdown label {
          font-size: 0.65rem !important;
        }
      }
    }
  `;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Refs для инпутов даты и времени
  const dateFromInputRef = useRef<HTMLInputElement>(null);
  const timeFromInputRef = useRef<HTMLInputElement>(null);
  const dateToInputRef = useRef<HTMLInputElement>(null);
  const timeToInputRef = useRef<HTMLInputElement>(null);

  // Состояние для всех заказов без фильтрации по поиску
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    // Убираем клиентскую проверку токена - middleware уже это делает
    // Если пользователь дошел до этой страницы, значит он авторизован
    console.log('📱 Tracking page mounted, loading orders...');
    fetchOrders();
  }, []);

  // Обновляем данные при изменении фильтров (но не сортировки)
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFromFilter, dateToFilter, timeFromFilter, timeToFilter]);

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
      
      // Получаем токен из localStorage или cookies
      let token = localStorage.getItem('adminToken');
      
      // Если токена нет в localStorage, пробуем получить из cookies
      if (!token) {
        const cookies = document.cookie.split(';');
        const adminTokenCookie = cookies.find(cookie => cookie.trim().startsWith('admin_token='));
        if (adminTokenCookie) {
          token = adminTokenCookie.split('=')[1];
          // Восстанавливаем токен в localStorage
          localStorage.setItem('adminToken', token);
          console.log('🔄 Token restored from cookies to localStorage');
        }
      }
      
      if (!token) {
        console.error('Токен не найден ни в localStorage, ни в cookies');
        // Не делаем редирект - middleware должен это обработать
        showError('Ошибка загрузки', 'Проблема с авторизацией. Попробуйте обновить страницу.');
        return;
      }
      
      // Формируем параметры фильтрации
      const dateFromString = dateFromFilter ? getDateTimeString(dateFromFilter, timeFromFilter) : null;
      const dateToString = dateToFilter ? getDateTimeString(dateToFilter, timeToFilter) : null;
      
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        sortBy: sortBy === 'date' ? 'createdAt' : sortBy,
        sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFromString && { dateFrom: dateFromString }),
        ...(dateToString && { dateTo: dateToString }),
      });

      console.log('API Request params:', {
        sortBy: sortBy === 'date' ? 'createdAt' : sortBy,
        sortOrder,
        statusFilter,
        dateFromString,
        dateToString
      });

      console.log('Current sortBy:', sortBy, 'sortOrder:', sortOrder);
      
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

        // Дополнительная клиентская сортировка для totalPrice
        if (sortBy === 'totalPrice') {
          ordersWithTracking.sort((a: any, b: any) => {
            const priceA = Number(a.totalPrice) || 0;
            const priceB = Number(b.totalPrice) || 0;
            
            if (sortOrder === 'desc') {
              return priceB - priceA; // От большего к меньшему
            } else {
              return priceA - priceB; // От меньшего к большему
            }
          });
          
          console.log('Client-side sorting applied:', {
            sortBy: 'totalPrice',
            sortOrder,
            firstOrder: ordersWithTracking[0]?.totalPrice,
            lastOrder: ordersWithTracking[ordersWithTracking.length - 1]?.totalPrice
          });
        }

        // Сохраняем все заказы
        setAllOrders(ordersWithTracking);
        setOrders(ordersWithTracking);
      } else {
        const errorData = await response.text();
        console.error('Ошибка загрузки заказов:', response.status, response.statusText, errorData);
        
        // Если ошибка авторизации, возможно токен истек
        if (response.status === 401) {
            console.log('Токен истек или невалиден, очищаем localStorage');
            localStorage.removeItem('adminToken');
            showError('Сессия истекла', 'Страница будет обновлена.');
            // Обновляем страницу вместо редиректа - middleware сам перенаправит
            setTimeout(() => {
              window.location.reload();
            }, 1500);
            return;
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
    }).format(Number(price)).replace('KGS', 'с.');
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

  const handleStatusClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // Предотвращаем открытие модального окна
    setSelectedOrder(order);
    setShowStatusDropdown(true);
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    console.log('🔄 Toggling sort order to:', newOrder);
    
    // МГНОВЕННО применяем сортировку к текущим заказам
    const sortedOrders = applySorting(orders, sortBy, newOrder);
    const sortedAllOrders = applySorting(allOrders, sortBy, newOrder);
    
    console.log('📦 Orders after toggle:', sortedOrders.slice(0, 3).map(o => ({ id: o.id, price: o.totalPrice })));
    
    setSortOrder(newOrder);
    setOrders(sortedOrders);
    setAllOrders(sortedAllOrders);
    
    // Принудительно обновляем компонент
    setForceUpdate(prev => prev + 1);
    
    // НЕ вызываем fetchOrders сразу
    // setTimeout(() => fetchOrders(), 100);
  };

  // Функция для применения сортировки к массиву заказов
  const applySorting = useCallback((ordersArray: Order[], sortType: SortOption, sortDirection: SortOrder) => {
    console.log('🔧 applySorting called with:', { sortType, sortDirection, ordersCount: ordersArray.length });
    
    // Определяем порядок статусов для логической сортировки
    const statusOrder = {
      'CREATED': 1,        // Создан
      'COURIER_WAIT': 2,   // Ожидает курьера
      'COURIER_PICKED': 3, // Курьер забрал
      'ENROUTE': 4,        // В пути
      'DELIVERED': 5,      // Доставлен
      'CANCELED': 6        // Отменен
    };
    
    const sorted = [...ordersArray].sort((a, b) => {
      if (sortType === 'totalPrice') {
        const priceA = Number(a.totalPrice) || 0;
        const priceB = Number(b.totalPrice) || 0;
        const result = sortDirection === 'desc' ? priceB - priceA : priceA - priceB;
        return result;
      } else if (sortType === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      } else { // status - логическая сортировка по процессу доставки
        const statusA = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] || 999;
        return sortDirection === 'desc' ? statusB - statusA : statusA - statusB;
      }
    });
    
    console.log('✅ Sorting result:', sorted.slice(0, 3).map(o => ({ id: o.id, status: o.status, price: o.totalPrice })));
    return sorted;
  }, []);

  // Функция для изменения сортировки с автоматическим порядком
  const handleSortChange = (newSortBy: SortOption) => {
    console.log('🔄 Changing sort to:', newSortBy);
    
    // Устанавливаем порядок по умолчанию в зависимости от типа сортировки
    let newSortOrder: SortOrder;
    if (newSortBy === 'totalPrice') {
      newSortOrder = 'desc'; // От большего к меньшему для суммы
    } else if (newSortBy === 'date') {
      newSortOrder = 'desc'; // Сначала новые заказы
    } else {
      newSortOrder = 'asc'; // По процессу доставки: Создан → Ожидает курьера → ... → Доставлен → Отменен
    }
    
    console.log('📊 Sort order set to:', newSortOrder);
    console.log('📦 Orders before sorting:', orders.length, orders.slice(0, 3).map(o => ({ id: o.id, price: o.totalPrice })));
    
    // МГНОВЕННО применяем сортировку к текущим заказам
    const sortedOrders = applySorting(orders, newSortBy, newSortOrder);
    const sortedAllOrders = applySorting(allOrders, newSortBy, newSortOrder);
    
    console.log('📦 Orders after sorting:', sortedOrders.slice(0, 3).map(o => ({ id: o.id, price: o.totalPrice })));
    
    // Обновляем состояние ПОСЛЕ сортировки
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setOrders(sortedOrders);
    setAllOrders(sortedAllOrders);
    
    // Принудительно обновляем компонент
    setForceUpdate(prev => prev + 1);
    
    // НЕ вызываем fetchOrders сразу, чтобы не перезаписать нашу сортировку
    // setTimeout(() => fetchOrders(), 100);
  };


  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrder) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        showError('Ошибка авторизации', 'Пожалуйста, войдите в систему заново.');
        return;
      }

      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        // Обновляем статус в локальном состоянии
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === selectedOrder.id 
              ? { ...order, status: newStatus }
              : order
          )
        );
        setAllOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === selectedOrder.id 
              ? { ...order, status: newStatus }
              : order
          )
        );
        setShowStatusDropdown(false);
        showSuccess('Статус обновлен', 'Статус заказа успешно изменен.');
      } else {
        const errorData = await response.json();
        showError('Ошибка обновления', errorData.error || 'Не удалось обновить статус заказа.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Ошибка обновления', 'Произошла ошибка при обновлении статуса.');
    }
  };

  // Обработка кликов вне элементов
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.date-time-dropdown')) {
        setShowDateTimeFrom(false);
        setShowDateTimeTo(false);
      }
      
      if (!target.closest('.status-dropdown')) {
        setShowStatusDropdown(false);
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
      <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden mobile-container">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg sm:rounded-xl">
                <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Трекинг доставки</h1>
                <p className="text-gray-300 text-sm sm:text-base lg:text-lg">Отслеживания заказов</p>
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
                    {allOrders.filter(order => order.status === 'ENROUTE').length}
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
                    {allOrders.filter(order => order.status === 'CANCELED').length}
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
          <div className="lg:hidden mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-600/50 w-full">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full mobile-stats-grid">
              {/* Created Orders */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">Созданы</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'CREATED').length}
                </div>
              </div>

              {/* Waiting for Courier */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">Ожидает курьера</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'COURIER_WAIT').length}
                </div>
              </div>

              {/* In Transit */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <MapPinIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">В пути</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'ENROUTE').length}
                </div>
              </div>

              {/* Courier Picked */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <TruckIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">Курьер забрал</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'COURIER_PICKED').length}
                </div>
              </div>

              {/* Delivered */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <CheckCircleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">Доставлен</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'DELIVERED').length}
                </div>
              </div>

              {/* Cancelled */}
              <div className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border border-gray-600/30 mobile-stats-card">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <XMarkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate mobile-stats-text">Отменен</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-white mt-1 mobile-stats-number">
                  {allOrders.filter(order => order.status === 'CANCELED').length}
                </div>
              </div>

              {/* Total */}
              <div className="bg-orange-500/20 rounded-lg p-2 sm:p-3 border border-orange-500/30 col-span-2 mobile-stats-card">
                <div className="text-center">
                  <div className="text-xs text-orange-300 mobile-stats-text">Всего</div>
                  <div className="text-lg sm:text-xl font-bold text-white mt-1 mobile-stats-number">
                    {allOrders.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 sm:p-3 md:p-4 border border-gray-700/50">
          <div className="space-y-3">
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
                   className="block w-full pl-10 pr-12 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 text-sm sm:text-base"
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
            <div className="space-y-3">
              {/* Sort Controls - Full Width */}
              <div className="flex items-center space-x-2">
                <div className="min-w-[200px]">
                  <div className="flex items-center space-x-2 border border-gray-600/50 rounded-lg px-3 py-3">
                    <BarsArrowUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value as SortOption)}
                      className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer min-w-0 flex-1"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="date" className="bg-gray-800 text-white">По дате</option>
                      <option value="totalPrice" className="bg-gray-800 text-white">По сумме</option>
                      <option value="status" className="bg-gray-800 text-white">По статусу</option>
                    </select>
                    <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </div>
                </div>

                <button
                  onClick={toggleSortOrder}
                  className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all duration-200 flex-shrink-0 ${
                    sortOrder === 'desc'
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                      : 'border-gray-600/50 text-gray-400 hover:border-gray-500/50 hover:text-gray-300'
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

              {/* Quick Date Buttons and Clear Filters */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Quick Date Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setQuickDateRange('yesterday')}
                    className="px-3 py-1.5 text-xs bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                  >
                    Вчера
                  </button>
                  <button
                    onClick={() => setQuickDateRange('today')}
                    className="px-3 py-1.5 text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-all duration-200"
                  >
                    Сегодня
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

              {/* Status Filter and Date Range - Same Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <option value="CREATED" className="bg-gray-800">Создан</option>
                      <option value="COURIER_WAIT" className="bg-gray-800">Ожидает курьера</option>
                      <option value="COURIER_PICKED" className="bg-gray-800">Курьер забрал</option>
                      <option value="ENROUTE" className="bg-gray-800">В пути</option>
                      <option value="DELIVERED" className="bg-gray-800">Доставлен</option>
                      <option value="CANCELED" className="bg-gray-800">Отменен</option>
                    </select>
                    <ChevronUpDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Date Range */}
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
                    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-4 px-4" onClick={(e) => e.target === e.currentTarget && setShowDateTimeFrom(false)}>
                      <div className="w-full max-w-xs sm:max-w-sm md:w-80 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl ring-1 ring-white/5 date-time-dropdown"
                           style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                          <CalendarDaysIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                          <span className="text-xs sm:text-sm">Выберите дату и время</span>
                        </h3>
                        <button
                          onClick={() => setShowDateTimeFrom(false)}
                          className="p-0.5 sm:p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5 sm:mb-2">Дата</label>
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
                              className="w-full px-2 py-1.5 sm:px-3 sm:py-2.5 border border-gray-600/50 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5 sm:mb-2">Время</label>
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
                              className="w-full px-2 py-1.5 sm:px-3 sm:py-2.5 border border-gray-600/50 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row space-y-1.5 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => setShowDateTimeFrom(false)}
                          className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-600 hover:to-red-600 text-white text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Применить
                        </button>
                        <button
                          onClick={() => {
                            setDateFromFilter('');
                            setTimeFromFilter('00:00');
                            setShowDateTimeFrom(false);
                          }}
                          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 border border-red-500/30"
                        >
                          Очистить
                        </button>
                      </div>
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
                    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-4 px-4" onClick={(e) => e.target === e.currentTarget && setShowDateTimeTo(false)}>
                      <div className="w-full max-w-xs sm:max-w-sm md:w-80 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl ring-1 ring-white/5 date-time-dropdown"
                           style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                          <CalendarDaysIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                          <span className="text-xs sm:text-sm">Выберите дату и время</span>
                        </h3>
                        <button
                          onClick={() => setShowDateTimeTo(false)}
                          className="p-0.5 sm:p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5 sm:mb-2">Дата</label>
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
                              className="w-full px-2 py-1.5 sm:px-3 sm:py-2.5 border border-gray-600/50 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5 sm:mb-2">Время</label>
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
                              className="w-full px-2 py-1.5 sm:px-3 sm:py-2.5 border border-gray-600/50 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500/50"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row space-y-1.5 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => setShowDateTimeTo(false)}
                          className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-600 hover:to-red-600 text-white text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Применить
                        </button>
                        <button
                          onClick={() => {
                            setDateToFilter('');
                            setTimeToFilter('23:59');
                            setShowDateTimeTo(false);
                          }}
                          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 border border-red-500/30"
                        >
                          Очистить
                        </button>
                      </div>
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
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-2 sm:p-3 lg:p-4 w-full">
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
              <div className="space-y-1.5 sm:space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => openOrderModal(order)}
                    className="w-full bg-gradient-to-r from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-lg border border-gray-700/40 p-3 hover:border-orange-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 group cursor-pointer overflow-hidden mobile-card"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                      {/* Status Icon */}
                      <div 
                        className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={(e) => handleStatusClick(e, order)}
                      >
                        {order.status === 'DELIVERED' ? (
                          <div className="w-full h-full bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : order.status === 'COURIER_PICKED' ? (
                          <div className="w-full h-full bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <TruckIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : order.status === 'CREATED' ? (
                          <div className="w-full h-full bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : order.status === 'COURIER_WAIT' ? (
                          <div className="w-full h-full bg-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : order.status === 'ENROUTE' ? (
                          <div className="w-full h-full bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <TruckIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : order.status === 'CANCELED' ? (
                          <div className="w-full h-full bg-red-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                            <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="text-white text-xs sm:text-sm font-semibold truncate mb-1">
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
                        <p className="text-gray-400 text-xs font-mono truncate">
                          #{String(order.orderNumber || order.id).slice(-8)}
                        </p>
                        </div>

                      {/* Price and Quantity */}
                      <div className="flex-shrink-0 text-right min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate" style={{color: '#00C950'}}>
                          {formatPrice(order.totalPrice)}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
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
                  <p className="text-gray-300 text-xs font-mono">#{String(selectedOrder.orderNumber || selectedOrder.id).slice(-8)}</p>
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
                            <div className="font-semibold text-xs" style={{color: '#00C950'}}>
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
                  <span className="font-semibold text-base" style={{color: '#00C950'}}>
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
                  className="cursor-pointer mb-4 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-all duration-200 group border border-gray-700/40"
                  onClick={() => setExpandedDelivery(!expandedDelivery)}
                >
                  {selectedOrder.trackingSteps && selectedOrder.trackingSteps.length > 0 ? (
                    <div className="space-y-3">
                      {/* Header with current status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {getStatusIcon(getCurrentStatus(selectedOrder).status, getCurrentStatus(selectedOrder).completed, getCurrentStatus(selectedOrder).current)}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-sm">
                              {getStatusText(getCurrentStatus(selectedOrder).status)}
                            </h3>
                            <p className="text-gray-400 text-xs">
                              Шаг {selectedOrder.trackingSteps.filter(step => step.completed || step.current).length} из {selectedOrder.trackingSteps.length}
                            </p>
                          </div>
                        </div>
                        <ChevronDownIcon 
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                            expandedDelivery ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                      
                      {/* Simple progress bar */}
                      <div className="w-full bg-gray-700/50 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(selectedOrder.trackingSteps.filter(step => step.completed || step.current).length / selectedOrder.trackingSteps.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm flex items-center">
                        <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                        Статус доставки
                      </h3>
                      <ChevronDownIcon 
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          expandedDelivery ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  )}
                </div>

                {expandedDelivery && (
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                    {selectedOrder.trackingSteps && selectedOrder.trackingSteps.length > 0 ? (
                      <div className="space-y-4">
                        {selectedOrder.trackingSteps?.map((step, index) => (
                          <div key={index} className="flex items-start space-x-4">
                            {/* Timeline icon */}
                            <div className="relative flex-shrink-0 mt-0.5">
                              {/* Vertical line */}
                              {index < selectedOrder.trackingSteps!.length - 1 && (
                                <div className={`absolute left-1/2 top-8 w-0.5 h-12 -translate-x-1/2 ${
                                  step.completed || step.current ? 'bg-blue-500/30' : 'bg-gray-600/30'
                                }`}></div>
                              )}
                              
                              {/* Status icon */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                step.current 
                                  ? 'bg-blue-500/20 border-blue-400 shadow-lg shadow-blue-500/30' 
                                  : step.completed 
                                    ? 'bg-green-500/20 border-green-400' 
                                    : 'bg-gray-600/20 border-gray-500'
                              }`}>
                                {step.current && (
                                  <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                                )}
                                
                                {/* Status-specific icons */}
                                {step.status === 'CREATED' && (
                                  <ClockIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-green-400' : 'text-gray-400'
                                  }`} />
                                )}
                                {step.status === 'COURIER_WAIT' && (
                                  <UserIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-green-400' : 'text-gray-400'
                                  }`} />
                                )}
                                {step.status === 'COURIER_PICKED' && (
                                  <CubeIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-green-400' : 'text-gray-400'
                                  }`} />
                                )}
                                {step.status === 'ENROUTE' && (
                                  <TruckIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-green-400' : 'text-gray-400'
                                  }`} />
                                )}
                                {step.status === 'DELIVERED' && (
                                  <CheckCircleIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-green-400' : 'text-gray-400'
                                  }`} />
                                )}
                                {step.status === 'CANCELED' && (
                                  <XMarkIcon className={`h-4 w-4 ${
                                    step.current ? 'text-blue-400' : step.completed ? 'text-red-400' : 'text-gray-400'
                                  }`} />
                                )}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className={`font-medium text-sm ${
                                  step.current 
                                    ? 'text-white' 
                                    : step.completed 
                                      ? 'text-gray-200' 
                                      : 'text-gray-400'
                                }`}>
                                  {getStatusText(step.status)}
                                </h4>
                                {step.current && (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                                    Текущий
                                  </span>
                                )}
                              </div>
                              
                              <p className={`text-xs leading-relaxed ${
                                step.current 
                                  ? 'text-gray-300' 
                                  : step.completed 
                                    ? 'text-gray-400' 
                                    : 'text-gray-500'
                              }`}>
                                {step.description}
                              </p>
                              
                              {(step.completed || step.current) && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {new Date(step.timestamp).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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

      {/* Status Dropdown Modal */}
      {showStatusDropdown && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Изменить статус заказа
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Заказ #{selectedOrder.orderNumber.slice(-8)}
            </p>
            
            <div className="space-y-2">
              {[
                { value: 'CREATED', label: 'Создан', icon: '🕐', color: 'blue' },
                { value: 'COURIER_WAIT', label: 'Ожидает курьера', icon: '👤', color: 'yellow' },
                { value: 'COURIER_PICKED', label: 'Курьер забрал', icon: '🚛', color: 'orange' },
                { value: 'ENROUTE', label: 'В пути', icon: '🚛', color: 'purple' },
                { value: 'DELIVERED', label: 'Доставлен', icon: '✅', color: 'green' },
                { value: 'CANCELED', label: 'Отменен', icon: '❌', color: 'red' }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                    selectedOrder.status === status.value
                      ? 'bg-gray-700 border border-gray-500'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-lg">{status.icon}</span>
                  <span className="text-white font-medium">{status.label}</span>
                  {selectedOrder.status === status.value && (
                    <span className="ml-auto text-orange-400 text-sm">Текущий</span>
                  )}
                </button>
                ))}
              </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStatusDropdown(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors duration-200"
              >
                Отмена
              </button>
          </div>
        </div>
      </div>
      )}
    </AdminLayout>
  );
}

