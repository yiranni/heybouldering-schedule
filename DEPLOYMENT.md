# Netlify 部署指南

本文档介绍如何将嘿抱工作后台部署到 Netlify。

## 前置要求

1. GitHub 账号
2. Netlify 账号（可使用 GitHub 登录）
3. PostgreSQL 数据库（推荐使用 Neon、Supabase 或其他云数据库服务）

## 部署步骤

### 1. 准备数据库

#### 选项 A: 使用 Neon (推荐)

1. 访问 [Neon](https://neon.tech/) 并创建免费账号
2. 创建新项目
3. 复制数据库连接字符串 (Connection String)

#### 选项 B: 使用 Supabase

1. 访问 [Supabase](https://supabase.com/) 并创建账号
2. 创建新项目
3. 在项目设置中找到数据库连接字符串

### 2. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/your-username/scheduler-app.git

# 推送到 GitHub
git push -u origin main
```

### 3. 在 Netlify 上部署

1. 登录 [Netlify](https://www.netlify.com/)
2. 点击 "Add new site" -> "Import an existing project"
3. 选择 "GitHub" 并授权 Netlify 访问你的仓库
4. 选择你的 scheduler-app 仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### 4. 配置环境变量

在 Netlify 项目设置中添加以下环境变量：

1. 进入 "Site settings" -> "Environment variables"
2. 添加以下变量：

```
DATABASE_URL="your-postgresql-connection-string"
AUTHORIZED_USERS="email1@example.com:password1,email2@example.com:password2"
```

**重要**:
- `DATABASE_URL`: 你的 PostgreSQL 数据库连接字符串
- `AUTHORIZED_USERS`: 授权用户列表，格式为 `邮箱:密码,邮箱:密码`
  - 示例: `admin@company.com:Admin123!,manager@company.com:Manager456!`

### 5. 初始化数据库

部署完成后，需要初始化数据库表结构：

```bash
# 在本地设置 DATABASE_URL 环境变量
export DATABASE_URL="your-postgresql-connection-string"

# 运行 Prisma 迁移
npx prisma migrate deploy

# 或者使用 db push（如果不需要迁移历史）
npx prisma db push
```

### 6. 重新部署

1. 在 Netlify 中点击 "Deploys" -> "Trigger deploy" -> "Deploy site"
2. 等待部署完成

### 7. 访问应用

部署成功后，你会得到一个 Netlify URL，如：
```
https://your-app-name.netlify.app
```

## 自定义域名（可选）

1. 在 Netlify 项目设置中，点击 "Domain management"
2. 点击 "Add custom domain"
3. 输入你的域名并按照指示配置 DNS

## 安全建议

1. **使用强密码**: 确保 `AUTHORIZED_USERS` 中的密码足够强
2. **定期更换密码**: 建议定期更新授权用户的密码
3. **限制用户数量**: 只添加需要访问系统的人员
4. **使用 HTTPS**: Netlify 默认提供免费 SSL 证书

## 故障排除

### 数据库连接失败

- 检查 `DATABASE_URL` 是否正确
- 确保数据库允许来自外部的连接
- 检查数据库是否正常运行

### 登录失败

- 检查 `AUTHORIZED_USERS` 环境变量格式是否正确
- 确保邮箱和密码之间用冒号分隔，多个用户用逗号分隔
- 检查浏览器控制台的错误信息

### 构建失败

- 检查 Node.js 版本是否兼容（推荐 18+）
- 查看 Netlify 的构建日志
- 确保所有依赖都已正确安装

## 维护

### 更新代码

```bash
# 本地修改代码后
git add .
git commit -m "Update description"
git push

# Netlify 会自动检测到推送并重新部署
```

### 更新授权用户

1. 在 Netlify 项目设置中修改 `AUTHORIZED_USERS` 环境变量
2. 重新部署应用

### 备份数据库

定期备份你的 PostgreSQL 数据库，大多数云数据库服务都提供自动备份功能。

## 成本

- **Netlify**: 免费套餐包括：
  - 100GB 带宽/月
  - 300 分钟构建时间/月
  - 无限站点

- **Neon**: 免费套餐包括：
  - 3GB 存储
  - 1 个项目
  - 自动暂停（闲置时）

## 支持

如遇到问题，请查看：
- Netlify 文档: https://docs.netlify.com/
- Next.js 文档: https://nextjs.org/docs
- Prisma 文档: https://www.prisma.io/docs
