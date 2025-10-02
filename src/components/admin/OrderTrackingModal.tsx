'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, TruckIcon, ClockIcon, CheckCircleIcon, MapPinIcon, BellIcon } from '@heroicons/react/24/outline';

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

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({ isOpen, onClose }: OrderTrackingModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        console.error('Токен не найден в localStorage');
        return;
      }
      
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
        
        setOrders(ordersWithTracking);
      } else {
        const errorData = await response.text();
        console.error('Ошибка загрузки заказов:', response.status, response.statusText, errorData);
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

    if (status === 'COURIER_WAIT' || status === 'COURIER_PICKED' || status === 'ENROUTE' || status === 'DELIVERED') {
      baseSteps.push({
        status: 'COURIER_WAIT',
        timestamp: new Date(orderDate.getTime() + 30 * 60000).toISOString(),
        description: 'Заказ ожидает курьера',
        completed: true
      });
    }

    if (status === 'COURIER_PICKED' || status === 'ENROUTE' || status === 'DELIVERED') {
      baseSteps.push({
        status: 'COURIER_PICKED',
        timestamp: new Date(orderDate.getTime() + 2 * 60 * 60000).toISOString(),
        description: 'Курьер получил заказ',
        completed: true
      });
    }

    if (status === 'ENROUTE' || status === 'DELIVERED') {
      baseSteps.push({
        status: 'ENROUTE',
        timestamp: new Date(orderDate.getTime() + 3 * 60 * 60000).toISOString(),
        description: 'Курьер в пути к получателю',
        completed: status === 'DELIVERED'
      });
    }

    if (status === 'DELIVERED') {
      baseSteps.push({
        status: 'DELIVERED',
        timestamp: new Date(orderDate.getTime() + 4 * 60 * 60000).toISOString(),
        description: 'Заказ доставлен получателю',
        completed: true
      });
    }

    if (status === 'CANCELED') {
      baseSteps.push({
        status: 'CANCELED',
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
      case 'COURIER_WAIT':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'COURIER_PICKED':
        return <TruckIcon className="h-5 w-5 text-orange-500" />;
      case 'ENROUTE':
        return <TruckIcon className="h-5 w-5 text-orange-500" />;
      case 'DELIVERED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'CANCELED':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Создан';
      case 'COURIER_WAIT': return 'Ожидает курьера';
      case 'COURIER_PICKED': return 'У курьера';
      case 'ENROUTE': return 'В пути';
      case 'DELIVERED': return 'Доставлен';
      case 'CANCELED': return 'Отменен';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700/30 mx-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Трекинг доставки</h2>
              <p className="text-xs sm:text-sm text-gray-400">Отслеживайте статус ваших заказов</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 h-[calc(90vh-120px)] sm:h-[calc(90vh-140px)] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-indigo-500/30"></div>
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-indigo-500 border-t-transparent absolute top-0"></div>
              </div>
              <p className="text-gray-400 mt-4 text-sm sm:text-base">Загружаем заказы...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="p-3 sm:p-4 bg-gray-700/30 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <TruckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Нет активных заказов</h3>
              <p className="text-gray-500 text-sm sm:text-base">У вас пока нет заказов для отслеживания</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-4 sm:p-6 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          <span className="text-xs sm:text-sm text-gray-400">Заказ от {new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                      
                      {/* Products List */}
                      <div className="space-y-2 mb-4">
                        {order.items?.map((item, index) => (
                          <div key={item.id} className="flex items-center justify-between bg-gray-800/40 rounded-lg p-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                                {item.quantity}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-white text-sm sm:text-base truncate">{item.variant.product.name}</h4>
                                <p className="text-xs sm:text-sm text-gray-400">{Number(item.price).toLocaleString()} сом за шт.</p>
                              </div>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className="font-semibold text-xs sm:text-sm" style={{color: '#00C950'}}>{(Number(item.price) * item.quantity).toLocaleString()} сом</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="text-gray-400">Клиент: {order.customerName}</span>
                        <span className="font-semibold" style={{color: '#00C950'}}>Итого: {(order.items?.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) || order.totalPrice || 0).toLocaleString()} сом</span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                        order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        order.status === 'ENROUTE' || order.status === 'COURIER_PICKED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        order.status === 'CANCELED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        <span className="w-4 h-4 flex-shrink-0">
                          {getStatusIcon(order.status, true)}
                        </span>
                        <span className="ml-2 whitespace-nowrap">{getStatusText(order.status)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <div className="border-t border-gray-700/30 pt-4 sm:pt-6">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-300 mb-4 flex items-center">
                      <TruckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Статус доставки
                    </h4>
                    <div className="relative">
                      <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-gray-600"></div>
                      <div className="space-y-3 sm:space-y-4">
                        {order.trackingSteps?.map((step, index) => (
                          <div key={index} className="relative flex items-start space-x-3 sm:space-x-4">
                            <div className={`relative z-10 flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                              step.completed 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30' 
                                : 'bg-gray-700 border-2 border-gray-600'
                            }`}>
                              {step.completed ? (
                                <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              ) : (
                                <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-3 sm:pb-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                                <p className={`text-xs sm:text-sm font-medium ${
                                  step.completed ? 'text-white' : 'text-gray-500'
                                }`}>
                                  {step.description}
                                </p>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {new Date(step.timestamp).toLocaleTimeString('ru-RU', { 
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

                    {/* Footer with Product Names and Order Number */}
                    <div className="border-t border-gray-700/30 pt-4 mt-6">
                      <div className="space-y-2">
                        {/* Product Names */}
                        <div className="flex flex-wrap gap-1">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
