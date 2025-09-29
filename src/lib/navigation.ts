import {
  HomeIcon,
  TagIcon,
  CubeIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

export const navigation = [
  { 
    name: 'Главная', 
    href: '/admin/dashboard', 
    icon: HomeIcon,
    color: 'text-blue-400',
    hoverColor: 'group-hover:text-blue-300',
    description: 'Все товары'
  },
  { 
    name: 'Товары', 
    href: '/admin/products', 
    icon: CubeIcon,
    color: 'text-green-400',
    hoverColor: 'group-hover:text-green-300',
    description: 'Управление каталогом'
  },
  { 
    name: 'Категории', 
    href: '/admin/categories', 
    icon: TagIcon,
    color: 'text-purple-400',
    hoverColor: 'group-hover:text-purple-300',
    description: 'Структура каталога'
  },
  { 
    name: 'Трекинг доставки', 
    href: '/admin/tracking', 
    icon: TruckIcon,
    color: 'text-orange-400',
    hoverColor: 'group-hover:text-orange-300',
    description: 'Отслеживание заказов'
  },
];
