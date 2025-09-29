'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import MobileProductCard from '@/components/admin/products/MobileProductCard';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
  seller: {
    id: string;
    fullname: string;
  };
  sizes: Array<{ name: string }>;
  colors: Array<{ name: string; colorCode: string }>;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      console.log('API Response:', data); // Отладочная информация
      
      const productsArray = data.products || data || [];
      console.log('Products Array:', productsArray); // Отладочная информация
      
      setProducts(productsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">Ошибка загрузки товаров: {error}</p>
          <button 
            onClick={fetchProducts}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-600/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Все товары
              </h1>
              <p className="text-gray-300">
                Полный каталог товаров магазина ({filteredProducts.length} товаров)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск товаров..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Add Product Button */}
              <button
                onClick={() => window.location.href = '/admin/products'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Добавить товар</span>
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50">
            <p className="text-gray-400 text-lg">
              {searchTerm ? 'Товары не найдены' : 'Товары отсутствуют'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => window.location.href = '/admin/products'}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Добавить первый товар
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
                {/* Product Image */}
                <div className="aspect-square bg-gray-700/30 relative overflow-hidden">
                  {product.imageUrl.length > 0 ? (
                    <img
                      src={product.imageUrl[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-600 rounded-lg mx-auto mb-2"></div>
                        <p className="text-sm">Нет изображения</p>
                      </div>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'ACTIVE' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {product.status === 'ACTIVE' ? 'Активный' : 'Неактивный'}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Цена:</span>
                      <span className="text-blue-400 font-bold text-lg">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Категория:</span>
                      <span className="text-gray-300">{product.category.name}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Продавец:</span>
                      <span className="text-gray-300">{product.seller.fullname}</span>
                    </div>

                    {/* Sizes */}
                    {product.sizes.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Размеры:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.sizes.map((size, index) => (
                            <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                              {size.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Colors */}
                    {product.colors.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Цвета:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.colors.map((color, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <div 
                                className="w-3 h-3 rounded-full border border-gray-600"
                                style={{ backgroundColor: color.colorCode }}
                              ></div>
                              <span className="text-gray-300 text-xs">{color.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Создан: {new Date(product.createdAt).toLocaleDateString('ru-RU')}</span>
                        <span>ID: {product.id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}