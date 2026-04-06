import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 生成邀请码
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const user = await getCurrentUser(token);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 检查是否是群成员
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId: user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: '不是群成员' }, { status: 403 });
    }

    // 生成6位邀请码
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    // 更新群聊邀请码
    await prisma.group.update({
      where: { id: params.id },
      data: {
        inviteCode: code,
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时有效
      },
    });

    return NextResponse.json({ code });
  } catch (error) {
    console.error('Generate invite code error:', error);
    return NextResponse.json({ error: '生成邀请码失败' }, { status: 500 });
  }
}
