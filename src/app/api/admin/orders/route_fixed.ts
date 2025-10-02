import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// GET - получить все заказы с пагинацией и фильтрацией
export async function GET(request: Request) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    console.log('API Orders: authHeader:', authHeader ? 'найден' : 'не найден');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('API Orders: Неверный формат заголовка авторизации');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('API Orders: токен извлечен, длина:', token.length);
    
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
      const { payload } = await jwtVerify(token, secret);
      console.log('API Orders: токен декодирован, userId:', payload.userId);
      
      if (!payload.userId) {
        console.log('API Orders: userId не найден в токене');
        return NextResponse.json({ error: 'Неверный токен' }, { status: 401 });
      }
      
      const userId = payload.userId as string;

      const { searchParams } = new URL(request.url);
    
      // Параметры пагинации
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;
      
      // Параметры фильтрации
      const status = searchParams.get('status');
      const contactType = searchParams.get('contactType');
      const paymentStatus = searchParams.get('paymentStatus');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      const search = searchParams.get('search');
      
      // Параметры сортировки
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';

      // Строим условия фильтрации
      const where: any = {
        // Фильтруем заказы только для товаров текущего продавца
        orderItems: {
          some: {
            product: {
              sellerId: userId
            }
          }
        }
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      if (contactType && contactType !== 'all') {
        where.contactType = contactType;
      }

      if (search && search.trim()) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { deliveryAddress: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          // Проверяем, содержит ли строка время
          const fromDate = dateFrom.includes('T') ? new Date(dateFrom) : new Date(dateFrom + 'T00:00:00.000Z');
          if (!isNaN(fromDate.getTime())) {
            where.createdAt.gte = fromDate;
          }
        }
        if (dateTo) {
          // Проверяем, содержит ли строка время
          const toDate = dateTo.includes('T') ? new Date(dateTo) : new Date(dateTo + 'T23:59:59.999Z');
          if (!isNaN(toDate.getTime())) {
            where.createdAt.lte = toDate;
          }
        }
      }

      // Условия для фильтрации по статусу платежа - убираем, так как payment не существует в модели
      // if (paymentStatus && paymentStatus !== 'all') {
      //   where.payment = {
      //     status: paymentStatus
      //   };
      // }

      // Строим условия сортировки
      const orderBy: any = {};
      if (sortBy === 'customerName') {
        orderBy.customerName = sortOrder;
      } else {
        orderBy.createdAt = sortOrder;
      }

      console.log('API Orders: выполняем запрос к базе данных с условиями:', JSON.stringify(where, null, 2));

      // Получаем заказы с подсчетом общего количества и статистики
      const [orders, totalCount, stats] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                },
                color: {
                  select: {
                    name: true,
                    colorCode: true
                  }
                },
                size: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.order.count({ where }),
        // Получаем статистику по статусам с теми же фильтрами
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: {
            status: true
          }
        })
      ]);

      console.log('API Orders: найдено заказов:', orders.length);

      // Преобразуем данные для фронтенда
      const transformedOrders = orders.map(order => {
        const itemsCount = order.orderItems?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;
        const productsCount = order.orderItems?.length || 0;
        const totalPrice = order.orderItems?.reduce((sum: number, item: any) => sum + (Number(item.price) * item.amount), 0) || 0;
        
        return {
          ...order,
          totalPrice: Number(totalPrice),
          itemsCount,
          productsCount,
          items: order.orderItems?.map((item: any) => ({
            ...item,
            quantity: item.amount, // Map amount to quantity for frontend compatibility
            price: Number(item.price)
          })) || []
        };
      });

      // Обрабатываем статистику по статусам
      const statusStats = {
        CREATED: 0,
        COURIER_WAIT: 0,
        COURIER_PICKED: 0,
        ENROUTE: 0,
        DELIVERED: 0,
        CANCELED: 0
      };

      stats.forEach(stat => {
        if (stat.status in statusStats) {
          statusStats[stat.status as keyof typeof statusStats] = stat._count.status;
        }
      });

      return NextResponse.json({
        orders: transformedOrders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: statusStats
      });
      
    } catch (jwtError) {
      console.log('API Orders: Ошибка декодирования JWT:', jwtError);
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 });
    }
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заказов', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
