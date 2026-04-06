import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 获取群聊详情
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

    const group = await prisma.group.findFirst({
      where: {
        id: params.id,
        isDeleted: false,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: '群聊不存在' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ error: '获取群聊详情失败' }, { status: 500 });
  }
}

// 删除群聊（仅群主）
export async function DELETE(
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

    const group = await prisma.group.findFirst({
      where: {
        id: params.id,
        ownerId: user.id,
        isDeleted: false,
      },
    });

    if (!group) {
      return NextResponse.json({ error: '群聊不存在或无权限' }, { status: 404 });
    }

    await prisma.group.update({
      where: { id: params.id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: '群聊已解散' });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: '解散群聊失败' }, { status: 500 });
  }
}
