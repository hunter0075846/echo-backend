import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
};

export function middleware(request: NextRequest) {
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 处理其他请求
  const response = NextResponse.next();

  // 添加 CORS 头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// 配置匹配路径
export const config = {
  matcher: '/api/:path*',
};
