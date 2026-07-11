import { NextRequest } from 'next/server';

import { forwardAuth } from '@/src/lib/server/auth-response';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return forwardAuth('/auth/vendor/login', { email, password });
}
