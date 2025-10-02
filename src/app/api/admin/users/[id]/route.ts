import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить сотрудника по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении сотрудника' },
      { status: 500 }
    );
  }
}

// PUT - обновить сотрудника
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fullname, phoneNumber, role, status } = body;

    // Валидация
    if (!fullname || !phoneNumber) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны для заполнения' },
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

    // Проверка на существование сотрудника
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      );
    }

    // Проверка на уникальность телефона (исключая текущего сотрудника)
    const userWithSamePhone = await prisma.user.findFirst({
      where: { 
        phoneNumber,
        id: { not: params.id },
      },
    });

    if (userWithSamePhone) {
      return NextResponse.json(
        { error: 'Сотрудник с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        fullname,
        phoneNumber,
        role: role as 'ADMIN' | 'COURIER' | 'SELLER',
        status: status as 'ACTIVE' | 'INACTIVE',
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении сотрудника' },
      { status: 500 }
    );
  }
}

// DELETE - удалить сотрудника
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка на существование сотрудника
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        role: true,
        _count: {
          select: {
            products: true,
            deliveredOrders: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      );
    }

    // Проверка на связанные данные
    if (existingUser._count.products > 0) {
      return NextResponse.json(
        { error: 'Невозможно удалить сотрудника с активными товарами' },
        { status: 400 }
      );
    }

    if (existingUser._count.deliveredOrders > 0) {
      return NextResponse.json(
        { error: 'Невозможно удалить сотрудника с доставленными заказами' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Сотрудник успешно удален' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении сотрудника' },
      { status: 500 }
    );
  }
}
