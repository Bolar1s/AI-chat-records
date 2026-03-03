# 项目操作记录

本文件用于记录 `ai-notes-app` 项目的所有重要操作、命令和实现细节。

## 2026-03-02

### 1. 项目初始化 (Project Initialization)
- **操作**: 创建配置特定的 Next.js 项目。
- **命令**:
  ```bash
  pnpm create next-app ai-notes-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
  ```
- **详情**:
  - 框架: Next.js (App Router)
  - 语言: TypeScript
  - 样式: Tailwind CSS
  - 规范: ESLint
  - 源码目录: `src/`
  - 导入别名: `@/*`

### 2. 数据库配置 (Database Setup - Prisma)
- **操作**: 安装并使用 SQLite 初始化 Prisma。
- **命令**:
  ```bash
  pnpm add -D prisma
  pnpm add @prisma/client
  pnpm approve-builds # 批准 prisma 的构建脚本
  pnpm add -D dotenv
  pnpm prisma init --datasource-provider sqlite
  ```
- **详情**:
  - ORM: Prisma
  - 数据库: SQLite (dev.db)
  - Schema 位置: `prisma/schema.prisma`
  - **重要修复**: Prisma 7+ 引入了 `prisma.config.ts`，需要在 schema.prisma 中移除 `datasource.url` 属性，改为在 config 文件中配置。

### 3. 数据库模型设计 (Schema Design)
- **操作**: 定义 `Topic` (主题) 和 `Message` (消息) 的数据库模型。
- **文件**: `prisma/schema.prisma`
- **模型**:
  - `Topic`: 存储对话主题 (id, title, createdAt, updatedAt)。
  - `Message`: 存储单条消息 (id, role, content, topicId)。
- **关系**: 一对多 (Topic -> Messages)。

### 4. 数据库迁移 (Migration)
- **操作**: 根据 Schema 创建 SQLite 数据库表。
- **命令**:
  ```bash
  pnpm prisma migrate dev --name init
  ```
- **结果**: 生成 `prisma/migrations` 目录，并创建 `dev.db` 文件。

### 5. 编写数据导入脚本 (Import Script)
- **操作**: 创建 TypeScript 脚本，用于从本地 Markdown 文件导入数据到 SQLite。
- **文件**: `scripts/import-md.ts`
- **功能**:
  - 扫描上级目录 (`../`) 中的 `YYYY-MM-DD.md` 文件。
  - 按正则 `## [Date] Role` 解析对话块。
  - 将文件名作为 `Topic.title`，对话内容作为 `Message` 存入数据库。
- **依赖**: 安装 `ts-node` 以直接运行 TS 脚本。

### 6. 执行数据导入 (Execute Import)
- **操作**: 运行导入脚本，将本地 Markdown 笔记存入 SQLite 数据库。
- **命令**:
  ```bash
  pnpm prisma generate # 修复 PrismaClient 导出问题
  npx ts-node scripts/import-md.ts
  ```
- **修复**: 
  - 删除 `prisma.config.ts` (Prisma 7 新特性，导致 ts-node 运行时环境问题)。
  - 恢复 `schema.prisma` 中的 `url = env("DATABASE_URL")`。
  - 重新生成 Client 并执行。
- **最终修正**: 
  - 由于 Prisma 7+ 与当前环境兼容性问题，**降级到 Prisma 6** (`6.19.2`) 以确保稳定性。
- **结果**: 成功扫描并导入符合格式的 Markdown 文件。

### 7. 前端 UI 开发 (Frontend UI)
- **操作**: 创建 Prisma 单例并实现笔记列表页面。
- **文件**:
  - `src/lib/prisma.ts`: PrismaClient 单例模式，防止开发环境下连接数耗尽。
  - `src/app/page.tsx`: 从数据库获取 `Topic` 列表并展示。
### 8. 详情页开发与 Markdown 渲染优化 (Detail Page & Markdown)
- **操作**: 实现笔记详情页并优化 Markdown 显示效果。
- **文件**:
  - `src/app/topic/[id]/page.tsx`: 动态路由页面，展示完整对话记录。
  - `tailwind.config.ts`: 启用 `@tailwindcss/typography` 插件。
- **依赖**:
  - `react-markdown`: 核心 Markdown 渲染组件。
  - `@tailwindcss/typography`: 提供美观的排版样式 (`prose` 类)。
  - `remark-gfm`: 增加对 GitHub Flavored Markdown (表格、任务列表、删除线等) 的支持。
### 9. 升级 Markdown 渲染引擎 (Markdown Engine Upgrade)
- **背景**: 原生 `react-markdown` 配置在处理表格和复杂格式时出现渲染异常，且缺乏代码高亮。
- **操作**: 封装独立的 `MarkdownRenderer` 组件，集成完整插件生态。
- **文件**: `src/components/MarkdownRenderer.tsx` (Client Component)
- **技术栈**:
  - `react-markdown`: 核心渲染。
  - `remark-gfm`: 支持表格、任务列表、删除线等 GitHub 风格语法。
  - `rehype-highlight`: 支持代码块语法高亮。
  - `rehype-raw`: 支持 Markdown 中嵌入的 HTML。
  - `highlight.js`: 提供代码高亮样式 (使用 `github-dark` 主题)。
### 10. 云数据库准备 (Cloud Database Prep)
- **目标**: 为部署到 Vercel 做准备 (Vercel 不支持本地 SQLite)。
- **方案**: 采用 Turso (基于 LibSQL 的边缘数据库)，它兼容 SQLite 协议且支持 HTTP 访问。
- **操作**:
  - 安装 `@libsql/client` 和 `@prisma/adapter-libsql@6.19.2`（与 Prisma 6 版本匹配）。
  - 修改 `prisma/schema.prisma`：使用 `DATABASE_URL` 环境变量，便于本地与云端切换。
  - 改造 `src/lib/prisma.ts`：若存在 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`，则使用 LibSQL driver adapter 连接云端；否则回退到本地 SQLite 文件。
- **状态**: 代码已就绪，等待用户配置环境变量。

### 11. 用户认证 (NextAuth + Prisma)
- **目标**: 公网部署后只允许本人访问，避免数据泄露。
- **方案**: NextAuth (Credentials) + Prisma Adapter。
- **策略**: Session 使用 JWT（Credentials Provider 需要）。
- **文件**:
  - `src/lib/auth.ts`: NextAuth 配置（Credentials 登录、Prisma Adapter、首次管理员引导创建）。
  - `src/app/api/auth/[...nextauth]/route.ts`: App Router 路由处理器。
  - `src/app/signin/page.tsx`: 登录页面。
  - `src/middleware.ts`: 访问保护（未登录跳转到 `/signin`）。
- **数据库**:
  - 更新 `prisma/schema.prisma` 增加 `User/Account/Session/VerificationToken` 等模型。
  - 执行迁移：`pnpm prisma migrate dev --name auth`。

### 12. Turso 初始化与数据同步 (Turso Init & Sync)
- **操作**:
  - `scripts/turso-apply-migrations.ts`: 将 `prisma/migrations/*/migration.sql` 应用到 Turso。
  - `scripts/turso-sync-from-local.ts`: 从本地 `prisma/dev.db` 同步 `Topic/Message` 数据到 Turso（保持 id 不变）。
- **备注**: 这两个脚本会从 `.env` 读取 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`。

## 2026-03-03

### 13. 推送到 GitHub (Push to GitHub)
- **目标**: 将 `ai-notes-app` 推送到 GitHub 仓库 `https://github.com/Bolar1s/AI-chat-records.git`。
- **安全**:
  - `.env*` 已在 `.gitignore` 中忽略，避免泄露密钥。
  - 本地 SQLite 数据库文件（如 `prisma/dev.db`）已忽略，避免误提交数据。
- **步骤**:
  ```bash
  git add -A
  git commit -m "Add-Turso-auth-sync"
  git branch -M main
  git remote add origin https://github.com/Bolar1s/AI-chat-records.git
  git push -u origin main
  ```
- **说明**:
  - 若出现网络连接失败（例如无法连接到 github.com:443），通常是网络/防火墙限制导致，需要在可访问 GitHub 的网络环境下执行 `git push`，或使用 GitHub Desktop 推送。

### 14. Vercel 部署报错修复 (Vercel Build Fix)
- **错误 1**: Turso URL scheme 不支持：`URL_SCHEME_NOT_SUPPORTED ... got "lbisql:"`
- **原因**: `TURSO_DATABASE_URL` 需要使用 `libsql://...`，但环境变量误写为 `lbisql://...`。
- **修复**:
  - 在代码中对 `TURSO_DATABASE_URL` 做归一化，自动把 `lbisql` 修正为 `libsql`。
  - 在 Vercel 环境变量中仍建议手动修正为 `libsql://...`（避免误配）。
- **错误 2**: `/signin` 预渲染失败：`useSearchParams() should be wrapped in a Suspense boundary`
- **原因**: Page 级别直接使用 `useSearchParams` 在构建阶段触发 CSR bailout 校验，导致构建失败。
- **修复**: 将登录表单拆分为子 Client Component，并在 `page.tsx` 中使用 `Suspense` 包裹。


