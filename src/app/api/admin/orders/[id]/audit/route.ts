import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить историю изменений заказа
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Проверяем существование заказа
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Получаем историю изменений (заглушка, так как модель OrderAudit не существует)
    const audits: Array<{
      id: string;
      orderId: string;
      action: string;
      oldValue: string | null;
      newValue: string | null;
      userId: string | null;
      createdAt: string;
    }> = [];

    return NextResponse.json({
      orderId: order.id,
      audits: audits
    });
  } catch (error) {
    console.error('Order audit GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения истории изменений', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
