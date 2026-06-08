import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'subtitle_merge_admin';
const ADMIN_PASSCODE = process.env.SUBTITLE_MERGE_ADMIN_PASSCODE || 'subtitle-admin';
const ADMIN_TOKEN = process.env.SUBTITLE_MERGE_ADMIN_TOKEN || 'subtitle-merge-admin';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const passcode = String(form.get('passcode') || '');
  if (passcode !== ADMIN_PASSCODE) {
    return new NextResponse('管理口令错误', { status: 401 });
  }
  const response = NextResponse.redirect(new URL('/admin', process.env.PUBLIC_BASE_URL || request.url));
  response.cookies.set(COOKIE_NAME, ADMIN_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
