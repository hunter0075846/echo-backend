# Vercel 部署检查清单

## 修复历史

1. ✅ 添加 `currentMembers` 字段到 Group 模型
2. ✅ 添加 `senderName` 字段到 GroupMessage 模型
3. ✅ 修复 `next.config.js` 配置
4. ✅ 增强 Prisma 客户端错误处理

## 当前修复

### 1. 修复 next.config.js
- 移除了过时的 `appDir` 配置
- 添加了 `output: 'standalone'`
- 添加了静态生成超时配置

### 2. 增强 Prisma 客户端
- 添加了环境变量检查
- 添加了连接测试函数

## 提交更改

在 Git Bash 中执行：

```bash
# 1. 进入后端目录
cd /c/Users/MateBook/Documents/trae_projects/echo/echo_backend

# 2. 重新生成 Prisma 客户端
npx prisma generate

# 3. 提交所有修复
git add .
git commit -m "Fix: Vercel deployment issues

- Fix next.config.js (remove appDir, add standalone output)
- Enhance Prisma client with error handling
- Add missing fields to schema (currentMembers, senderName)"

# 4. 推送到 GitHub
git push origin main
```

## Vercel 环境变量检查

确保以下变量已配置：

| 变量名 | 状态 |
|--------|------|
| DATABASE_URL | ✅ 已配置 |
| JWT_SECRET | ✅ 已配置 |
| AI_PROVIDER | ✅ 已配置 |
| DEEPSEEK_API_KEY | ✅ 已配置 |
| DEEPSEEK_BASE_URL | ✅ 已配置 |
| DEEPSEEK_MODEL | ✅ 已配置 |

## 如果还有问题

1. 检查 Vercel 构建日志
2. 确保数据库连接字符串正确
3. 确认 Supabase 允许外部连接
