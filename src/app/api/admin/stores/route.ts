import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить список продавцов (заменяем магазины на продавцов)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Построение условий поиска для продавцов
    const where: any = {
      role: 'SELLER' // Только продавцы
    };
    
    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== '') {
      where.status = isActive === 'true' ? 'ACTIVE' : 'INACTIVE';
    }

    // Получение продавцов с пагинацией
    const [sellers, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          fullname: true,
          phoneNumber: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              products: true,
              deliveredOrders: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      stores: sellers, // Возвращаем как stores для совместимости с фронтендом
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении продавцов' },
      { status: 500 }
    );
  }
}

// POST - создать нового продавца
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullname, phoneNumber, password, status = 'ACTIVE' } = body;

    // Валидация
    if (!fullname || !phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Проверка на уникальность телефона
    const existingSeller = await prisma.user.findFirst({
      where: { phoneNumber },
    });

    if (existingSeller) {
      return NextResponse.json(
        { error: 'Пользователь с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    const seller = await prisma.user.create({
      data: {
        fullname,
        phoneNumber,
        password, // В реальном приложении пароль должен быть хешированным
        role: 'SELLER',
        status: status as 'ACTIVE' | 'INACTIVE',
      },
      select: {
        id: true,
        fullname: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            deliveredOrders: true,
          },
        },
      },
    });

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании продавца' },
      { status: 500 }
    );
  }
}
