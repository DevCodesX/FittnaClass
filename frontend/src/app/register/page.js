import { redirect } from 'next/navigation';

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const role = params?.role === 'instructor' ? 'instructor' : params?.role === 'student' ? 'student' : null;

  redirect(role ? `/?auth=register&role=${role}` : '/?auth=register');
}
