# 修复 Vercel 构建问题 - 添加动态路由配置

## 问题原因

Vercel 构建时会尝试预渲染 API 路由，但 Prisma 在构建时会尝试连接数据库，而构建环境没有数据库连接，导致失败。

## 解决方案

为所有使用 Prisma 的 API 路由添加动态配置：

```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

## 需要修复的文件

以下文件需要添加动态配置（放在 import 语句之后）：

1. ✅ `app/api/auth/login/route.ts` - 已修复
2. `app/api/auth/me/route.ts`
3. `app/api/groups/route.ts`
4. `app/api/groups/[id]/route.ts`
5. `app/api/groups/[id]/members/route.ts`
6. `app/api/groups/[id]/messages/route.ts`
7. `app/api/groups/[id]/invite/route.ts`
8. `app/api/groups/[id]/leave/route.ts`
9. `app/api/groups/join/route.ts`
10. `app/api/topics/route.ts`
11. `app/api/topics/[id]/route.ts`
12. `app/api/topics/[id]/comments/route.ts`
13. `app/api/topics/[id]/like/route.ts`

## 修复示例

在每个文件的开头（import 语句之后）添加：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ... 其他 imports

// 禁用静态生成，避免构建时连接数据库
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

## 提交更改

```bash
cd /c/Users/MateBook/Documents/trae_projects/echo/echo_backend

git add .
git commit -m "Fix: Add dynamic export to all API routes to prevent build errors"

git push origin main
```
