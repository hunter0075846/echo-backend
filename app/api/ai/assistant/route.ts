import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { openai, getAIConfig } from '@/lib/ai';

// 小安的系统提示词
const XIAO_AN_PROMPT = `你是"小安"，回响App的群聊AI助手。你的性格温和、善解人意，像一位贴心的朋友。

你的能力包括：
1. 推荐热门话题 - 根据群聊氛围推荐适合讨论的话题
2. 分析群聊氛围 - 总结群内的活跃度和讨论热点
3. 生成回忆总结 - 帮助整理群聊中的精彩瞬间
4. 回答群聊相关问题 - 解答用户关于群聊的疑问

回复风格要求：
- 语气友好、轻松，使用表情符号增加亲和力
- 回复简洁明了，避免过长
- 如果用户问题超出你的能力范围，诚实告知
- 保持中立，不参与群内争议

当前群聊上下文：用户正在一个群聊中与你对话。`;

// POST /api/ai/assistant - 与小安对话
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: '登录已过期' },
        { status: 401 }
      );
    }
    const userId = payload.userId;

    // 获取请求参数
    const { message, groupId, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 验证用户是否在群中
    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: '你不是该群成员' },
          { status: 403 }
        );
      }
    }

    // 构建消息历史
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: XIAO_AN_PROMPT },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // 调用 AI API
    const aiConfig = getAIConfig();
    console.log(`[小安] 使用AI提供商: ${aiConfig.provider}, 模型: ${aiConfig.model}`);

    const response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content?.trim() || '抱歉，我暂时无法回复，请稍后再试~';

    // 记录对话日志（可选）
    console.log(`[小安] 用户: ${message.substring(0, 50)}...`);
    console.log(`[小安] 回复: ${reply.substring(0, 50)}...`);

    return NextResponse.json({
      reply,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[小安] 对话错误:', error);
    return NextResponse.json(
      { error: '服务暂时不可用，请稍后再试' },
      { status: 500 }
    );
  }
}

// GET /api/ai/assistant - 获取小安信息和配置
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: '登录已过期' },
        { status: 401 }
      );
    }

    const aiConfig = getAIConfig();

    return NextResponse.json({
      name: '小安',
      avatar: '🤖',
      description: '你的群聊AI助手',
      capabilities: [
        '推荐热门话题',
        '分析群聊氛围',
        '生成回忆总结',
        '回答群聊问题',
      ],
      aiProvider: aiConfig.provider,
      model: aiConfig.model,
    });

  } catch (error) {
    console.error('[小安] 获取信息错误:', error);
    return NextResponse.json(
      { error: '服务暂时不可用' },
      { status: 500 }
    );
  }
}
