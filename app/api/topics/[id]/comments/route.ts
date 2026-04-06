import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/ai';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(500, '评论内容不能超过500字'),
  parentId: z.string().optional(),
});

// 获取话题评论
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.topicComment.findMany({
      where: {
        topicId: params.id,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 });
  }
}

// 添加评论
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

    const body = await request.json();
    const result = commentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { content, parentId } = result.data;

    // 内容审核
    const moderation = await moderateContent(content);
    if (!moderation.isSafe) {
      return NextResponse.json(
        { error: '内容不合规', reason: moderation.reason },
        { status: 400 }
      );
    }

    // 创建评论
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.topicComment.create({
        data: {
          topicId: params.id,
          authorId: user.id,
          content,
          parentId,
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

      // 更新话题评论数
      await tx.topic.update({
        where: { id: params.id },
        data: { commentCount: { increment: 1 } },
      });

      return newComment;
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: '添加评论失败' }, { status: 500 });
  }
}
