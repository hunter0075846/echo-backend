import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 退出群聊
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

    // 群主不能退出，只能解散
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: '群主不能退出群聊，请使用解散功能' },
        { status: 400 }
      );
    }

    // 退出群聊
    await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({
        where: {
          id: membership.id,
        },
      });

      await tx.group.update({
        where: { id: params.id },
        data: {
          currentMembers: { decrement: 1 },
        },
      });
    });

    return NextResponse.json({ message: '已退出群聊' });
  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json({ error: '退出群聊失败' }, { status: 500 });
  }
}
