import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getRequiredEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function normalizeLibsqlUrl(rawUrl: string) {
  const url = rawUrl.trim()
  if (url.startsWith('lbisql://')) return `libsql://${url.slice('lbisql://'.length)}`
  if (url.startsWith('lbisql:')) return `libsql:${url.slice('lbisql:'.length)}`
  return url
}

async function createLocalPrisma() {
  const dbFile = path.resolve(__dirname, '../prisma/dev.db').replaceAll('\\', '/')
  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbFile}`,
      },
    },
  })
}

async function createRemotePrisma() {
  type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0]
  type PrismaAdapter = PrismaClientOptions extends { adapter?: infer A } ? A : never

  const adapter = new PrismaLibSQL({
    url: normalizeLibsqlUrl(getRequiredEnv('TURSO_DATABASE_URL')),
    authToken: getRequiredEnv('TURSO_AUTH_TOKEN'),
  }) as unknown as PrismaAdapter

  return new PrismaClient({ adapter })
}

async function main() {
  const local = await createLocalPrisma()
  const remote = await createRemotePrisma()

  try {
    const topics = await local.topic.findMany()
    const messages = await local.message.findMany()

    if (topics.length === 0) {
      process.stdout.write('No local topics found. Skip sync.\n')
      return
    }

    const topicBatchSize = 50
    for (let i = 0; i < topics.length; i += topicBatchSize) {
      const batch = topics.slice(i, i + topicBatchSize)
      await remote.$transaction(
        batch.map((t) =>
          remote.topic.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              title: t.title,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            },
            update: {
              title: t.title,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            },
          }),
        ),
      )
    }

    const messageBatchSize = 50
    for (let i = 0; i < messages.length; i += messageBatchSize) {
      const batch = messages.slice(i, i + messageBatchSize)
      await remote.$transaction(
        batch.map((m) =>
          remote.message.upsert({
            where: { id: m.id },
            create: {
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
              topicId: m.topicId,
            },
            update: {
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
              topicId: m.topicId,
            },
          }),
        ),
      )
    }

    const localCount = await local.topic.count()
    const remoteCount = await remote.topic.count()
    process.stdout.write(`Sync done. Topics local=${localCount}, remote=${remoteCount}\n`)
  } finally {
    await local.$disconnect()
    await remote.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
