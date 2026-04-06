import OpenAI from 'openai';

// AI 提供商配置接口
interface AIProviderConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  defaultModel: string;
  supportsModeration: boolean;
}

// 从环境变量读取配置，支持多个提供商
const getProviderConfig = (): AIProviderConfig => {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai';

  const configs: Record<string, AIProviderConfig> = {
    openai: {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      supportsModeration: true,
    },
    deepseek: {
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      supportsModeration: false,
    },
    // 可以在这里添加更多提供商
    // 例如：通义千问、文心一言等
    qwen: {
      name: 'qwen',
      apiKey: process.env.QWEN_API_KEY || '',
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
      defaultModel: process.env.QWEN_MODEL || 'qwen-turbo',
      supportsModeration: false,
    },
  };

  return configs[provider] || configs.openai;
};

// 获取当前配置
const config = getProviderConfig();

// 初始化 OpenAI 客户端（兼容多种提供商）
const openai = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
});

// 获取模型名称（优先使用环境变量配置）
const getModel = (): string => {
  // 检查是否有特定任务的模型配置
  const taskModel = process.env.AI_TASK_MODEL;
  if (taskModel) return taskModel;
  
  return config.defaultModel;
};

// 生成话题标题
export async function generateTopicTitle(content: string, type: 'link' | 'image'): Promise<string> {
  try {
    if (type === 'link') {
      // 对于链接，尝试提取标题
      return content.slice(0, 50);
    }
    
    // 对于图片，使用 AI 生成描述
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: '你是一个话题标题生成助手。请根据用户提供的图片描述生成一个简短的话题标题（20字以内）。',
        },
        {
          role: 'user',
          content: `请为这张图片生成一个话题标题：${content}`,
        },
      ],
      max_tokens: 50,
    });

    return response.choices[0]?.message?.content?.trim() || '分享了一张图片';
  } catch (error) {
    console.error('AI generate title error:', error);
    return type === 'link' ? '分享了一个链接' : '分享了一张图片';
  }
}

// 生成话题描述
export async function generateTopicDescription(content: string, type: 'link' | 'image'): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: '你是一个话题描述生成助手。请根据用户提供的内容生成一段简短的描述（100字以内）。',
        },
        {
          role: 'user',
          content: `请为以下内容生成描述：${content}`,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('AI generate description error:', error);
    return '';
  }
}

// 内容审核
export async function moderateContent(content: string): Promise<{ isSafe: boolean; reason?: string }> {
  try {
    // 如果提供商支持原生 moderation API
    if (config.supportsModeration && config.name === 'openai') {
      const response = await openai.moderations.create({
        input: content,
      });

      const result = response.results[0];
      if (result.flagged) {
        const categories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category);
        return { isSafe: false, reason: `包含不当内容: ${categories.join(', ')}` };
      }

      return { isSafe: true };
    }

    // 其他提供商使用聊天接口进行审核
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: '你是一个内容审核助手。请判断以下内容是否包含不当内容（暴力、色情、仇恨言论等）。只回复 "safe" 或 "unsafe"。',
        },
        {
          role: 'user',
          content: content,
        },
      ],
      max_tokens: 10,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (result === 'unsafe') {
      return { isSafe: false, reason: '内容可能包含不当信息' };
    }
    return { isSafe: true };
  } catch (error) {
    console.error('AI moderate error:', error);
    // 审核失败时默认放行
    return { isSafe: true };
  }
}

// 生成投票选项
export async function generateVoteOptions(topicTitle: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: '你是一个投票选项生成助手。请根据话题生成2-4个投票选项，返回JSON数组格式。',
        },
        {
          role: 'user',
          content: `请为话题"${topicTitle}"生成投票选项`,
        },
      ],
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';
    const options = JSON.parse(content);
    return Array.isArray(options) ? options.slice(0, 4) : ['支持', '反对', '中立'];
  } catch (error) {
    console.error('AI generate vote options error:', error);
    return ['支持', '反对', '中立'];
  }
}

// 导出配置信息（用于调试）
export const getAIConfig = () => ({
  provider: config.name,
  model: getModel(),
  baseURL: config.baseURL,
});
