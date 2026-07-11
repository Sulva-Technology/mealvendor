import { NextRequest } from 'next/server';

import { forwardAuth } from '@/src/lib/server/auth-response';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return forwardAuth('/auth/vendor/accept-invite', {
    email: typeof body?.email === 'string' ? body.email : '',
    password: typeof body?.password === 'string' ? body.password : '',
    token: typeof body?.token === 'string' ? body.token : '',
    ...(typeof body?.fullName === 'string' ? { fullName: body.fullName } : {}),
    ...(typeof body?.redirectTo === 'string' ? { redirectTo: body.redirectTo } : {})
  });
}
