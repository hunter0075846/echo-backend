import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const joinSchema = z.object({
  code: z.string().length(6, '邀请码必须是6位'),
});

// 通过邀请码加入群聊
export async function POST(request: NextRequest) {
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
    const result = joinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // 查找群聊
    const group = await prisma.group.findFirst({
      where: {
        inviteCode: code.toUpperCase(),
        isDeleted: false,
        inviteExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: '邀请码无效或已过期' },
        { status: 404 }
      );
    }

    // 检查是否已在群中
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: group.id,
        userId: user.id,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: '已在群聊中' }, { status: 400 });
    }

    // 检查群是否已满
    if (group.currentMembers >= group.maxMembers) {
      return NextResponse.json({ error: '群聊已满' }, { status: 400 });
    }

    // 加入群聊
    await prisma.$transaction(async (tx) => {
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
          role: 'member',
        },
      });

      await tx.group.update({
        where: { id: group.id },
        data: {
          currentMembers: { increment: 1 },
        },
      });
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ error: '加入群聊失败' }, { status: 500 });
  }
}
