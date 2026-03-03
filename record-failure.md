# 项目错误与故障排除记录 (Project Failure & Troubleshooting Log)

本文件用于记录 `ai-notes-app` 项目开发过程中遇到的错误、原因分析及解决方案。

## 2026-03-02

### 1. Prisma Init 脚本执行失败
- **错误**: `&&` 运算符在 PowerShell 中不可用。
- **原因**: 用户环境使用 PowerShell，而我提供的命令使用了 Bash 风格的 `&&` 链接多条命令。
- **解决方案**: 分开执行命令，或使用 `;` 分隔（不推荐，因无错误中断），最佳实践是分步执行。

### 2. Prisma Client 模块未找到
- **错误**: `Module '"@prisma/client"' has no exported member 'PrismaClient'.`
- **原因**: Prisma Client 未生成，或生成路径与导入路径不匹配。Prisma 7+ 引入了新的配置方式，导致默认行为变更。
- **解决方案**: 运行 `pnpm prisma generate` 强制重新生成 Client。

### 3. Prisma Client 初始化参数错误 (Prisma 7+ 兼容性问题)
- **错误**: 
  - `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`
  - `The datasource property url is no longer supported in schema files.`
- **原因**: Prisma 7 引入了强制的 `prisma.config.ts` 模式，即使删除该文件，CLI 行为或缓存似乎仍倾向于新模式，且与 `ts-node` 环境存在兼容性问题（无法正确加载配置）。
- **尝试**:
    - 尝试1: 在 `schema.prisma` 中移除 `url` -> 导致 Client 初始化失败。
    - 尝试2: 在 `import-md.ts` 中手动传 `datasourceUrl` -> 类型错误，API 不兼容。
    - 尝试3: 删除 `prisma.config.ts` 并恢复 schema 配置 -> 依然报错 `P1012`。
- **最终解决方案**: **降级到 Prisma 6**。
  ```bash
  pnpm add -D prisma@6
  pnpm add @prisma/client@6
  pnpm prisma generate
  ```

### 4. TS 脚本执行错误 (ESM vs CommonJS)
- **错误**: `ReferenceError: __dirname is not defined in ES module scope`
- **原因**: `ts-node` 在当前环境下默认以 ESM 模式运行 `.ts` 文件，而 `__dirname` 是 CommonJS 特有的全局变量。
- **解决方案**: 使用 `url` 模块手动构建 `__dirname`。
  ```typescript
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```

### 5. 数据库表不存在
- **错误**: `The table main.Topic does not exist in the current database.`
- **原因**: 虽然配置了 Schema，但尚未执行 Migration 将表结构应用到 SQLite 数据库文件 (`dev.db`)。之前的 Migration 可能因为 Prisma 版本问题未成功应用。
- **解决方案**: 运行 `pnpm prisma migrate dev --name init`。

## 2026-03-03

### 6. Prisma Generate 失败 (Windows 文件锁)
- **错误**: `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp -> query_engine-windows.dll.node`
- **原因**: 开发服务器运行中占用了 Prisma Query Engine DLL，导致 Windows 无法重命名/替换文件。
- **解决方案**: 先停止 `pnpm dev`，再执行 `pnpm prisma generate`，完成后重新启动开发服务器。

### 7. Turso/LibSQL 适配器导入错误
- **错误**: `Export PrismaLibSQL doesn't exist ... Did you mean to import PrismaLibSql?`
- **原因**: `@prisma/adapter-libsql` 的导出名称为 `PrismaLibSql`（大小写敏感），并且需要与 Prisma 主版本保持一致。
- **解决方案**:
  - 使用与 Prisma 6 匹配的版本：`@prisma/adapter-libsql@6.19.2`
  - 在 Prisma Client 初始化中使用 `PrismaLibSql` 作为 driver adapter factory。

### 8. NextAuth Credentials 触发 500 (Session Strategy 不兼容)
- **错误**: `CALLBACK_CREDENTIALS_JWT_ERROR: Signin in with credentials only supported if JWT strategy is enabled`
- **原因**: NextAuth 的 Credentials Provider 需要使用 `session.strategy = "jwt"`，否则会导致认证流程报错并返回 500。
- **解决方案**: 将 NextAuth 配置从 `database` 改为 `jwt`，并使用 `next-auth/jwt` 在 middleware 中校验登录态。
