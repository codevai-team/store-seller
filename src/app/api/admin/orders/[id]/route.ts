import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить заказ по ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
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
            color: true,
            size: true
          }
        },
        courier: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Вычисляем общую стоимость
    const totalPrice = order.orderItems.reduce((sum, item) => sum + Number(item.price) * item.amount, 0);
    const itemsCount = order.orderItems.reduce((sum, item) => sum + item.amount, 0);

    // Преобразуем данные для фронтенда
    const transformedOrder = {
      ...order,
      totalPrice: totalPrice,
      itemsCount: itemsCount,
      productsCount: order.orderItems.length,
      items: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        categoryName: item.product.category.name,
        quantity: item.amount,
        price: Number(item.price),
        color: item.color?.name || null,
        size: item.size?.name || null
      })),
      courierName: order.courier?.fullname || null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error('Order GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заказа', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - обновить заказ
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      status, 
      customerName, 
      customerPhone, 
      deliveryAddress,
      courierId,
      customerComment,
      adminComment,
      cancelComment
    } = body;

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (status !== undefined) updateData.status = status;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;
    if (courierId !== undefined) updateData.courierId = courierId;
    if (customerComment !== undefined) updateData.customerComment = customerComment;
    if (adminComment !== undefined) updateData.adminComment = adminComment;
    if (cancelComment !== undefined) updateData.cancelComment = cancelComment;

    // Обновляем заказ
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
            color: true,
            size: true
          }
        },
        courier: true
      }
    });

    // Вычисляем общую стоимость
    const totalPrice = updatedOrder.orderItems.reduce((sum, item) => sum + Number(item.price) * item.amount, 0);
    const itemsCount = updatedOrder.orderItems.reduce((sum, item) => sum + item.amount, 0);

    // Преобразуем данные для фронтенда
    const transformedOrder = {
      ...updatedOrder,
      totalPrice: totalPrice,
      itemsCount: itemsCount,
      productsCount: updatedOrder.orderItems.length,
      items: updatedOrder.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        categoryName: item.product.category.name,
        quantity: item.amount,
        price: Number(item.price),
        color: item.color?.name || null,
        size: item.size?.name || null
      })),
      courierName: updatedOrder.courier?.fullname || null,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString()
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error('Order PUT error:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления заказа', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - удалить заказ
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Удаляем заказ (orderItems удалятся автоматически благодаря onDelete: Cascade)
    await prisma.order.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Заказ успешно удален' });
  } catch (error) {
    console.error('Order DELETE error:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления заказа', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}