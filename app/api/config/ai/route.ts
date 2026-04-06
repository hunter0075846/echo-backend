import { NextRequest, NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 获取 AI 配置信息（仅管理员可用）
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

    // 获取 AI 配置（不包含敏感信息如 API Key）
    const config = getAIConfig();

    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      baseURL: config.baseURL,
      env: {
        AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
        OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        QWEN_MODEL: process.env.QWEN_MODEL || 'qwen-turbo',
      },
    });
  } catch (error) {
    console.error('Get AI config error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}
