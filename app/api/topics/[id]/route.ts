import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 获取话题详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topic = await prisma.topic.findFirst({
      where: {
        id: params.id,
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            phone: true,
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json({ error: '话题不存在' }, { status: 404 });
    }

    // 增加浏览量
    await prisma.topic.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Get topic error:', error);
    return NextResponse.json({ error: '获取话题详情失败' }, { status: 500 });
  }
}

// 删除话题
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

    const topic = await prisma.topic.findFirst({
      where: {
        id: params.id,
        authorId: user.id,
        isDeleted: false,
      },
    });

    if (!topic) {
      return NextResponse.json({ error: '话题不存在或无权限' }, { status: 404 });
    }

    await prisma.topic.update({
      where: { id: params.id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: '话题已删除' });
  } catch (error) {
    console.error('Delete topic error:', error);
    return NextResponse.json({ error: '删除话题失败' }, { status: 500 });
  }
}
