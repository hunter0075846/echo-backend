import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Echo Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login - 发送验证码',
        verify: 'PUT /api/auth/login - 验证登录',
        me: 'GET /api/auth/me - 获取当前用户',
      },
      topics: {
        list: 'GET /api/topics - 获取话题列表',
        create: 'POST /api/topics - 创建话题',
      },
    },
  });
}
