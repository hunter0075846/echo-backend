import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// 禁用静态生成，避免构建时连接数据库
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().optional(),
});

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { phone, password, nickname } = result.data;

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 409 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`,
      },
    });

    // 生成 JWT
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
    });

    return NextResponse.json({
      message: '注册成功',
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
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败' },
      { status: 500 }
    );
  }
}

// 用户登录
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

    const { phone, password } = result.data;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 400 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 400 }
      );
    }

    // 生成 JWT
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
    });

    return NextResponse.json({
      message: '登录成功',
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
