# 修复 Vercel 部署问题

## 修复历史

### 修复 1: 添加 currentMembers 字段 ✓

### 修复 2: 添加 senderName 字段 ✓

## 当前修复步骤

在 **Git Bash** 中执行：

```bash
# 1. 进入后端目录
cd /c/Users/MateBook/Documents/trae_projects/echo/echo_backend

# 2. 重新生成 Prisma 客户端
npx prisma generate

# 3. 创建数据库迁移
npx prisma migrate dev --name add_missing_fields

# 4. 提交更改
git add .
git commit -m "Fix: Add senderName field to GroupMessage model"

# 5. 推送到 GitHub
git push origin main
```

## 验证

推送到 GitHub 后，Vercel 会自动重新部署。

等待部署完成后，访问：
```
https://echo-backend-xxx.vercel.app/api
```
