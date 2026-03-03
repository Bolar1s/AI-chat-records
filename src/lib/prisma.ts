import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0]
type PrismaAdapter = PrismaClientOptions extends { adapter?: infer A } ? A : never

const prismaClientSingleton = () => {
  // 如果配置了 Turso 环境变量，优先使用 Turso
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }) as unknown as PrismaAdapter
    return new PrismaClient({ adapter })
  }

  // 否则回退到本地 SQLite
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
