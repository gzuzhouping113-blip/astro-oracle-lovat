# 解梦 · 星轨神谕

一个融合周公解梦、荣格原型分析和现代认知睡眠机制的 AI 梦境解析应用。用户注册登录后，可以保存自己的梦境档案、查看历史记录，并生成可下载的宇宙风格分享卡。

## 功能

- 账号注册/登录：自建账号密码体系，密码只保存加密哈希。
- 述梦入口：选择醒来情绪，填写梦境描述和近期现实事件。
- AI 解析：生成梦境摘要、关键词、东方传统象征、心理分析、认知睡眠机制、核心意象和综合建议。
- 梦境档案：解析完成后自动保存到 Neon Postgres，可筛选、回看和删除。
- 分享卡片：根据梦境与解析结果生成卡片文案，并调用豆包 SeedDream 生成视觉图。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Neon Postgres
- OpenAI-compatible Chat Completions API
- 火山引擎豆包 SeedDream 图像生成

## 快速开始

```bash
npm install
copy .env.example .env
npm run dev
```

开发服务默认运行在：

```text
http://localhost:3000
```

## 数据库

推荐使用 Neon Postgres 免费版。创建 Neon 项目后，把连接串填入：

```text
DATABASE_URL=postgresql://...
```

初始化数据库表：

```bash
npm run db:init
```

会创建 4 张表：

- `users`
- `sessions`
- `dream_records`
- `dream_cards`

## 环境变量

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 必需 | Neon Postgres 连接串。 |
| `CUSTOM_AI_API_KEY` | AI 解析必需 | OpenAI-compatible 文本模型 API Key。 |
| `CUSTOM_AI_BASE_URL` | 可选 | OpenAI-compatible API Base URL。 |
| `CUSTOM_AI_MODEL` | 可选 | 文本模型名称，默认 `gpt-5.5`。 |
| `DOUBAO_API_KEY` | 生成图片必需 | 火山引擎豆包 SeedDream 图像生成 API Key。 |
| `NEXT_PUBLIC_SITE_URL` | 建议 | 正式访问地址，用于 Open Graph / Twitter metadata。 |

不要提交 `.env`、API Key 或数据库连接串。Vercel 上线时，在项目的 Environment Variables 中配置这些变量。

## 常用脚本

```bash
npm run dev      # 启动开发服务
npm run build    # 生产构建
npm run start    # 启动生产服务
npm run lint     # ESLint 检查
npm run db:init  # 初始化 Neon 数据库表
```

## 主要页面

- `/`：述梦表单。
- `/parser`：AI 解析结果。
- `/card`：生成分享卡，并查看卡片历史。
- `/archive`：查看、筛选、打开或删除梦境档案。

## API

- `POST /api/auth/register`：注册账号。
- `POST /api/auth/login`：登录。
- `POST /api/auth/logout`：退出登录。
- `GET /api/auth/me`：读取当前用户。
- `POST /api/dream/interpret`：生成梦境解析。
- `GET /api/dream/records`：读取当前用户梦境档案。
- `POST /api/dream/records`：保存梦境档案。
- `DELETE /api/dream/records/:id`：删除梦境档案。
- `GET /api/dream/cards`：读取当前用户卡片历史。
- `POST /api/dream/cards`：保存卡片历史。
- `POST /api/dream/generate-card`：生成分享卡文案和图片。
- `POST /api/dream/generate-image`：单独生成梦境图片。

## Vercel 部署

1. 在 Neon 创建免费 Postgres 数据库。
2. 把 `DATABASE_URL` 填到 Vercel Environment Variables。
3. 配置 `CUSTOM_AI_API_KEY`，需要生成图片则配置 `DOUBAO_API_KEY`。
4. 在本地或 Neon SQL Console 执行 `db/schema.sql`，或本地运行 `npm run db:init`。
5. Vercel 导入仓库，Framework Preset 选择 `Next.js`。
6. Build Command 使用 `npm run build`。
7. Deploy。

## 本地检查

```bash
npm run lint
npm run build
```

