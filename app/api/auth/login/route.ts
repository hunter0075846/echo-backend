import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, generatePhoneCode } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().regex(/^\d{6}$/, '验证码必须是6位数字'),
});

// 存储验证码（实际项目中应使用 Redis）
const codeStore = new Map<string, { code: string; expiresAt: number }>();

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 生成验证码
    const code = generatePhoneCode();
    
    // 存储验证码（5分钟有效）
    codeStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // TODO: 发送短信验证码
    console.log(`验证码 for ${phone}: ${code}`);

    return NextResponse.json({
      message: '验证码已发送',
      // 开发环境返回验证码
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { error: '发送验证码失败' },
      { status: 500 }
    );
  }
}

// 验证登录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { phone, code } = result.data;

    // 验证验证码
    const storedCode = codeStore.get(phone);
    if (!storedCode || storedCode.code !== code || Date.now() > storedCode.expiresAt) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      );
    }

    // 清除验证码
    codeStore.delete(phone);

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // 新用户注册
      user = await prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
        },
      });
    }

    // 生成 JWT
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        gender: user.gender,
        birthday: user.birthday,
        dailyTopicQuota: user.dailyTopicQuota,
        maxDailyTopicQuota: user.maxDailyTopicQuota,
        quotaResetAt: user.quotaResetAt,
        anonymousMessageCount: user.anonymousMessageCount,
        anonymousQuotaResetAt: user.anonymousQuotaResetAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
