import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить список сотрудников
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const role = searchParams.get('role');

    const skip = (page - 1) * limit;

    // Построение условий поиска
    const where: any = {};
    
    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // Получение сотрудников с пагинацией
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          fullname: true,
          phoneNumber: true,
          role: true,
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
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении сотрудников' },
      { status: 500 }
    );
  }
}

// POST - создать нового сотрудника
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullname, phoneNumber, password, role = 'SELLER' } = body;

    // Валидация
    if (!fullname || !phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Имя, телефон и пароль обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Валидация телефона
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Неверный формат номера телефона' },
        { status: 400 }
      );
    }

    // Проверка на уникальность телефона
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Сотрудник с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        fullname,
        phoneNumber,
        password, // В реальном приложении пароль должен быть хешированным
        role: role as 'ADMIN' | 'COURIER' | 'SELLER',
      },
      select: {
        id: true,
        fullname: true,
        phoneNumber: true,
        role: true,
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании сотрудника' },
      { status: 500 }
    );
  }
}
