import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const user = await getCurrentUser(token);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

// 更新用户信息
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const user = await getCurrentUser(token);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, avatar, gender, birthday } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(avatar !== undefined && { avatar }),
        ...(gender !== undefined && { gender }),
        ...(birthday !== undefined && { birthday: new Date(birthday) }),
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      phone: updatedUser.phone,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
      gender: updatedUser.gender,
      birthday: updatedUser.birthday,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}
