import { PrismaClient } from '@prisma/client';

// PrismaClient 单例模式
// 参考: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices

declare global {
  var prisma: PrismaClient | undefined;
}

// 在构建时返回一个模拟的 PrismaClient，避免连接数据库
// 在运行时返回真实的 PrismaClient
const createPrismaClient = (): PrismaClient => {
  // 检查是否在 Next.js 构建阶段
  // 在 Vercel 构建时，NEXT_PHASE 环境变量会被设置为 'phase-production-build'
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                      (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL);
  
  if (isBuildTime) {
    console.log('[Prisma] Build time detected, returning mock client');
    // 构建时返回一个模拟对象
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return () => Promise.resolve();
        }
        // 对于所有模型方法，返回一个返回空数组的函数
        return () => Promise.resolve([]);
      },
    });
  }

  console.log('[Prisma] Runtime detected, creating real client');
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// 使用全局变量在开发环境中保持单例
const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export { prisma };
