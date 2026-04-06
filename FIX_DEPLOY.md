# 修复 Vercel 部署问题

## 问题原因
Prisma 模型缺少 `currentMembers` 字段，导致构建失败。

## 修复步骤

### 1. 本地执行（在 Git Bash 中）

```bash
# 进入后端目录
cd /c/Users/MateBook/Documents/trae_projects/echo/echo_backend

# 重新生成 Prisma 客户端
npx prisma generate

# 创建数据库迁移
npx prisma migrate dev --name add_current_members

# 提交更改
git add .
git commit -m "Fix: Add currentMembers field to Group model"

# 推送到 GitHub
git push origin main
```

### 2. Vercel 会自动重新部署

推送到 GitHub 后，Vercel 会自动触发新的部署。

### 3. 验证部署

等待部署完成后，访问：
```
https://echo-backend-xxx.vercel.app/api
```

## 如果还有问题

检查 Vercel 构建日志，查看是否有其他错误。
