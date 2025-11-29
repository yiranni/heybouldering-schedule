# 嘿抱排班系统

专业的教练排班管理系统，基于 Next.js 14、React 18、TypeScript、Tailwind CSS 和 PostgreSQL 构建。

## 功能特性

- ✅ **教练管理** - 添加、编辑、删除教练信息
- ✅ **门店管理** - 支持多门店配置和自定义班次
- ✅ **智能排班** - 自动生成周排班，支持手动调整
- ✅ **工作量统计** - 实时显示每位教练的工作时长和班次
- ✅ **拖拽排班** - 直观的拖拽操作
- ✅ **邮箱密码验证** - 保护系统仅限授权人员访问
- ✅ **数据持久化** - PostgreSQL 数据库存储
- ✅ **导出功能** - 导出排班表为文本格式

## 技术栈

- **Next.js 14** - React 框架 (App Router)
- **React 18** - 用户界面库
- **TypeScript** - 类型安全开发
- **Tailwind CSS** - 样式框架
- **PostgreSQL** - 关系型数据库
- **Prisma** - ORM 工具
- **Lucide React** - 图标库

## 快速开始

### 1. 环境要求

- Node.js 18+
- PostgreSQL 14+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：

```env
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/scheduler_db?schema=public"

# 授权用户（邮箱:密码格式，多个用户用逗号分隔）
AUTHORIZED_USERS="admin@example.com:password123,manager@example.com:password456"
```

### 4. 初始化数据库

```bash
# 创建数据库表
npx prisma migrate dev

# 或使用 db push
npx prisma db push
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3001](http://localhost:3001)

## 登录系统

首次访问时，系统会要求登录。使用在 `.env` 文件中配置的邮箱和密码登录。

**安全提示**:
- 使用强密码（至少 8 位，包含字母、数字和特殊字符）
- 定期更换密码
- 不要在公共场所共享登录凭证

## 部署

### Netlify 部署

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

快速步骤：

1. 推送代码到 GitHub
2. 在 [Netlify](https://www.netlify.com/) 导入项目
3. 配置环境变量（DATABASE_URL 和 AUTHORIZED_USERS）
4. 部署完成

### 推荐的数据库服务

- [Neon](https://neon.tech/) - 免费的 PostgreSQL 托管服务
- [Supabase](https://supabase.com/) - 开源的 Firebase 替代品
- [Railway](https://railway.app/) - 简单的云部署平台

## 项目结构

```
scheduler-app/
├── app/
│   ├── api/                  # API 路由
│   │   ├── auth/            # 认证相关 API
│   │   ├── coaches/         # 教练管理 API
│   │   ├── schedules/       # 排班管理 API
│   │   └── stores/          # 门店管理 API
│   ├── components/          # React 组件
│   │   ├── AuthGuard.tsx    # 认证守卫
│   │   ├── CoachList.tsx    # 教练列表
│   │   ├── ScheduleCalendar.tsx  # 排班日历
│   │   ├── ShiftModal.tsx   # 班次调整弹窗
│   │   └── ...
│   ├── hooks/               # 自定义 Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型定义
│   ├── constants/           # 常量配置
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 主页面
├── prisma/
│   └── schema.prisma        # 数据库模型定义
├── public/                  # 静态资源
├── .env.example             # 环境变量示例
├── netlify.toml             # Netlify 配置
├── DATABASE_SETUP.md        # 数据库设置指南
├── DEPLOYMENT.md            # 部署指南
└── package.json             # 项目依赖
```

## 可用脚本

### `npm run dev`

启动开发服务器，支持热重载。

### `npm run build`

构建生产版本到 `.next` 目录。

### `npm start`

启动生产服务器（需先运行 `npm run build`）。

### `npm run lint`

运行 ESLint 检查代码质量。

### `npx prisma studio`

打开 Prisma Studio 可视化管理数据库。

## 使用指南

### 添加教练

1. 在左侧边栏点击"添加教练"
2. 填写教练姓名和头像缩写
3. 选择颜色标识
4. 保存

### 配置门店

1. 在门店列表点击"添加门店"
2. 设置门店名称和班次时间
3. 可配置自定义班次（支持多个班次）

### 生成排班

1. 选择目标周（使用日期导航）
2. 点击"开始排班"自动生成
3. 可手动调整：
   - 拖拽教练到班次格子
   - 点击"..."调整班次
   - 点击"×"删除排班

### 导出排班表

点击"导出"按钮，下载文本格式的排班表。

## 常见问题

### 数据库连接失败

- 检查 PostgreSQL 是否正在运行
- 验证 DATABASE_URL 配置是否正确
- 确保数据库已创建

### 登录失败

- 检查 AUTHORIZED_USERS 格式是否正确
- 确保邮箱和密码匹配
- 查看浏览器控制台错误信息

### 排班保存失败

- 检查网络连接
- 确保数据库正常运行
- 查看开发者工具的网络请求

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，请创建 Issue。
