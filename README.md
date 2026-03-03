# ai-notes-app

本项目用于将本地 Markdown 对话笔记导入数据库，并用 Next.js 展示（列表 + 详情页 Markdown 渲染），支持 Turso 云数据库与登录保护。

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000/

## 导入 Markdown

将 `../YYYY-MM-DD.md` 文件导入数据库：

```bash
npx ts-node scripts/import-md.ts
```

## 登录保护（NextAuth Credentials）

需要在 `.env` 配置：

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

首次使用管理员账号登录会自动创建管理员用户（仅在数据库中尚无任何用户时触发）。

## Turso（云数据库）

在 `.env` 配置：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

`TURSO_DATABASE_URL` 需要使用 `libsql://...` 形式的 URL。

然后执行：

```bash
npx ts-node scripts/turso-apply-migrations.ts
npx ts-node scripts/turso-sync-from-local.ts
```

## Vercel 部署

在 Vercel 项目中设置以下环境变量（至少）：

- `NEXTAUTH_URL`（生产域名，例如 `https://xxx.vercel.app`）
- `NEXTAUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

项目已配置 `postinstall` 自动执行 `prisma generate`。

部署前确保 Turso 已完成建表与数据同步（在本地执行一次即可）：

```bash
npx ts-node scripts/turso-apply-migrations.ts
npx ts-node scripts/turso-sync-from-local.ts
```
