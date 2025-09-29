import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  // Проверяем, является ли запрос к админ-панели
  if (request.nextUrl.pathname.startsWith('/admin')) {
    console.log('Middleware: Проверка пути:', request.nextUrl.pathname);
    
    // Получаем токен из заголовка Authorization или из cookies
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('admin_token');
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken.value;
    }
    
    console.log('Middleware: Токен найден:', !!token);

    // Если токен есть, проверяем его валидность
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
        const { payload } = await jwtVerify(token, secret);
        console.log('Middleware: Токен декодирован, пользователь:', payload.fullname);
        
        // Если пользователь аутентифицирован и имеет права доступа
        if (payload.authenticated === true && (payload.role === 'ADMIN' || payload.role === 'SELLER')) {
          // Если он пытается зайти на страницы логина или просто /admin - перенаправляем на дашборд
          if (request.nextUrl.pathname === '/admin/login' || 
              request.nextUrl.pathname === '/admin' ||
              request.nextUrl.pathname === '/admin/') {
            console.log('Middleware: Аутентифицированный пользователь на странице логина, перенаправляем на дашборд');
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          }
          
          // Для всех остальных админ страниц - разрешаем доступ
          console.log('Middleware: Токен валидный, разрешаем доступ');
          return NextResponse.next();
        }
      } catch (error) {
        console.log('Middleware: Ошибка проверки токена:', error);
        // Токен недействителен, удаляем его и перенаправляем на логин
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        response.cookies.delete('admin_token');
        return response;
      }
    }
    
    // Если токена нет или он недействителен
    // Пропускаем только страницу логина
    if (request.nextUrl.pathname === '/admin/login') {
      console.log('Middleware: Пропускаем страницу логина');
      return NextResponse.next();
    }

    // Для всех остальных админ страниц требуем аутентификацию
    console.log('Middleware: Токен отсутствует или недействителен, перенаправляем на логин');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
