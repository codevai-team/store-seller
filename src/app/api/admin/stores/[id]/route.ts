import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить продавца по ID (заменяем филиал на продавца)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seller = await prisma.user.findUnique({
      where: { 
        id: params.id,
        role: 'SELLER' // Только продавцы
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
          take: 5,
        },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: 'Продавец не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(seller);
  } catch (error) {
    console.error('Error fetching seller:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении продавца' },
      { status: 500 }
    );
  }
}

// PUT - обновить продавца
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fullname, phoneNumber, status } = body;

    // Валидация
    if (!fullname || !phoneNumber) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Проверка на существование продавца
    const existingSeller = await prisma.user.findUnique({
      where: { 
        id: params.id,
      },
    });

    if (!existingSeller || existingSeller.role !== 'SELLER') {
      return NextResponse.json(
        { error: 'Продавец не найден' },
        { status: 404 }
      );
    }

    // Проверка на уникальность телефона (исключая текущего продавца)
    const sellerWithSamePhone = await prisma.user.findFirst({
      where: { 
        phoneNumber,
        id: { not: params.id },
      },
    });

    if (sellerWithSamePhone) {
      return NextResponse.json(
        { error: 'Пользователь с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    const seller = await prisma.user.update({
      where: { id: params.id },
      data: {
        fullname,
        phoneNumber,
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

    return NextResponse.json(seller);
  } catch (error) {
    console.error('Error updating seller:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении продавца' },
      { status: 500 }
    );
  }
}

// DELETE - удалить продавца
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка на существование продавца
    const existingSeller = await prisma.user.findUnique({
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

    if (!existingSeller || existingSeller.role !== 'SELLER') {
      return NextResponse.json(
        { error: 'Продавец не найден' },
        { status: 404 }
      );
    }

    // Проверка на связанные данные
    if (existingSeller._count.products > 0) {
      return NextResponse.json(
        { error: 'Невозможно удалить продавца с активными товарами' },
        { status: 400 }
      );
    }

    if (existingSeller._count.deliveredOrders > 0) {
      return NextResponse.json(
        { error: 'Невозможно удалить продавца с доставленными заказами' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Продавец успешно удален' });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении продавца' },
      { status: 500 }
    );
  }
}
