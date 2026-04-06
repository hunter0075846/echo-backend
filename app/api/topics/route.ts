import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateTopicTitle, generateTopicDescription, moderateContent } from '@/lib/ai';
import { z } from 'zod';

const createTopicSchema = z.object({
  sourceType: z.enum(['link', 'image']),
  sourceUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  content: z.string().min(1, '内容不能为空'),
});

// 获取话题列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'latest'; // latest, hottest
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(search && {
        title: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),
    };

    const orderBy = sort === 'hottest'
      ? [
          { viewCount: 'desc' as const },
          { commentCount: 'desc' as const },
          { createdAt: 'desc' as const },
        ]
      : { createdAt: 'desc' as const };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.topic.count({ where }),
    ]);

    return NextResponse.json({
      topics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get topics error:', error);
    return NextResponse.json(
      { error: '获取话题列表失败' },
      { status: 500 }
    );
  }
}

// 创建话题
export async function POST(request: NextRequest) {
  try {
    // 验证用户
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const user = await getCurrentUser(token);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    // 检查每日配额
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.quotaResetAt && user.quotaResetAt < today) {
      // 重置配额
      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyTopicQuota: 0,
          quotaResetAt: today,
        },
      });
    } else if (user.dailyTopicQuota >= user.maxDailyTopicQuota) {
      return NextResponse.json(
        { error: '今日发话题配额已用完' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createTopicSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { sourceType, sourceUrl, imageUrl, content } = result.data;

    // 内容审核
    const moderation = await moderateContent(content);
    if (!moderation.isSafe) {
      return NextResponse.json(
        { error: '内容不合规', reason: moderation.reason },
        { status: 400 }
      );
    }

    // 生成标题和描述
    const title = await generateTopicTitle(content, sourceType);
    const description = await generateTopicDescription(content, sourceType);

    // 创建话题
    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        imageUrl,
        sourceUrl,
        sourceType,
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // 更新用户配额
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyTopicQuota: { increment: 1 },
        quotaResetAt: today,
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Create topic error:', error);
    return NextResponse.json(
      { error: '创建话题失败' },
      { status: 500 }
    );
  }
}
