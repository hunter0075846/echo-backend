import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createGroupSchema = z.object({
  name: z.string().min(1, '群聊名称不能为空').max(50, '群聊名称不能超过50字'),
  description: z.string().max(200, '描述不能超过200字').optional(),
});

// 获取我的群聊列表
export async function GET(request: NextRequest) {
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

    const groups = await prisma.group.findMany({
      where: {
        isDeleted: false,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ error: '获取群聊列表失败' }, { status: 500 });
  }
}

// 创建群聊
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
    const result = createGroupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    // 创建群聊并添加创建者为群主
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          ownerId: user.id,
          currentMembers: 1,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return newGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: '创建群聊失败' }, { status: 500 });
  }
}
