import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 获取群成员列表
export async function GET(
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

    const members = await prisma.groupMember.findMany({
      where: {
        groupId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: '获取成员列表失败' }, { status: 500 });
  }
}
