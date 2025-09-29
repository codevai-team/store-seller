import { redirect } from 'next/navigation';

export default function Home() {
  // Перенаправляем на админ-панель
  redirect('/admin/dashboard');
}
