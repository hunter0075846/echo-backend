import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 点赞话题
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

    const topic = await prisma.topic.findFirst({
      where: {
        id: params.id,
        isDeleted: false,
      },
    });

    if (!topic) {
      return NextResponse.json({ error: '话题不存在' }, { status: 404 });
    }

    await prisma.topic.update({
      where: { id: params.id },
      data: { likeCount: { increment: 1 } },
    });

    return NextResponse.json({ message: '点赞成功' });
  } catch (error) {
    console.error('Like topic error:', error);
    return NextResponse.json({ error: '点赞失败' }, { status: 500 });
  }
}
