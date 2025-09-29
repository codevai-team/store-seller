import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body;

    // Ищем пользователя по номеру телефона
    const user = await prisma.user.findUnique({
      where: { 
        phoneNumber: login 
      },
    });

    // Проверяем, существует ли пользователь и имеет ли он права доступа
    if (!user || user.role !== 'SELLER') {
      return NextResponse.json(
        { message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем, что пользователь активен
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Ваш аккаунт неактивен. Обратитесь к администратору.' },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Создаем полноценный JWT токен для авторизации
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const token = await new SignJWT({ 
      userId: user.id,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname,
      role: user.role,
      authenticated: true,
      timestamp: Date.now()
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d') // Токен действует 7 дней
    .sign(secret);

    return NextResponse.json(
      { 
        success: true,
        token: token,
        user: {
          id: user.id,
          fullname: user.fullname,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        message: 'Успешная аутентификация' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}