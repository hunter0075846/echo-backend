import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/ai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sendMessageSchema = z.object({
  content: z.string().min(1, '消息内容不能为空').max(1000, '消息内容不能超过1000字'),
  mediaUrl: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

// 获取群消息
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

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId: params.id,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
}

// 发送消息
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

    const body = await request.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { content, mediaUrl, isAnonymous } = result.data;

    // 内容审核
    const moderation = await moderateContent(content);
    if (!moderation.isSafe) {
      return NextResponse.json(
        { error: '内容不合规', reason: moderation.reason },
        { status: 400 }
      );
    }

    // 检查匿名发言配额
    if (isAnonymous) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (user.anonymousQuotaResetAt && user.anonymousQuotaResetAt < today) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            anonymousMessageCount: 0,
            anonymousQuotaResetAt: today,
          },
        });
      } else if (user.anonymousMessageCount >= 3) {
        return NextResponse.json(
          { error: '今日匿名发言配额已用完' },
          { status: 403 }
        );
      }
    }

    // 创建消息
    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.groupMessage.create({
        data: {
          groupId: params.id,
          senderId: user.id,
          content,
          mediaUrl,
          isAnonymous,
          senderName: isAnonymous ? null : user.nickname,
        },
      });

      // 更新匿名发言配额
      if (isAnonymous) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            anonymousMessageCount: { increment: 1 },
            anonymousQuotaResetAt: new Date(),
          },
        });
      }

      return newMessage;
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
  }
}
