'use strict'

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 你的 Markdown 文件夹路径
// 假设脚本在 scripts/ 目录，那么 Markdown 在上上级目录
const NOTES_DIR = path.resolve(__dirname, '../../')

// 正则表达式：匹配 ## [日期] User/Assistant
// 示例：## [2026-03-02] User
const HEADER_REGEX = /^##\s+\[(.*?)\]\s+(User|Assistant)\s*$/gm

function normalizeLibsqlUrl(rawUrl: string) {
  const url = rawUrl.trim()
  if (url.startsWith('lbisql://')) return `libsql://${url.slice('lbisql://'.length)}`
  if (url.startsWith('lbisql:')) return `libsql:${url.slice('lbisql:'.length)}`
  return url
}

function createPrisma() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl && tursoToken) {
    type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0]
    type PrismaAdapter = PrismaClientOptions extends { adapter?: infer A } ? A : never
    const adapter = new PrismaLibSQL({
      url: normalizeLibsqlUrl(tursoUrl),
      authToken: tursoToken,
    }) as unknown as PrismaAdapter
    return new PrismaClient({ adapter })
  }

  const dbFile = path.resolve(__dirname, '../prisma/dev.db').replaceAll('\\', '/')
  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbFile}`,
      },
    },
  })
}

function parseHeaderDate(raw: string) {
  const dt = new Date(raw)
  if (!Number.isNaN(dt.getTime())) return dt
  return null
}

async function main() {
  const prisma = createPrisma()

  console.log(`🚀 开始扫描目录: ${NOTES_DIR}`)

  const files = fs
    .readdirSync(NOTES_DIR)
    .filter((file) => file.endsWith('.md') && /^\d{4}-\d{2}-\d{2}\.md$/.test(file))

  if (files.length === 0) {
    console.log('⚠️  未找到符合格式 (YYYY-MM-DD.md) 的 Markdown 文件')
    return
  }

  console.log(`📂 找到 ${files.length} 个文件:`, files)

  try {
    for (const file of files) {
      const filePath = path.join(NOTES_DIR, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      const topicTitle = file.replace('.md', '')

      console.log(`\n📄 处理文件: ${file}`)

      let dbTopic = await prisma.topic.findFirst({ where: { title: topicTitle }, orderBy: { createdAt: 'asc' } })
      if (!dbTopic) {
        dbTopic = await prisma.topic.create({
          data: { title: topicTitle },
        })
        console.log(`✅ 创建新主题: ${topicTitle}`)
      } else {
        console.log(`ℹ️  主题已存在: ${topicTitle} (ID: ${dbTopic.id})`)
      }

      const matches = [...content.matchAll(HEADER_REGEX)]

      if (matches.length === 0) {
        console.log(`⚠️  文件 ${file} 中未找到符合格式的消息块`)
        continue
      }

      await prisma.message.deleteMany({ where: { topicId: dbTopic.id } })

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const rawDate = match[1]
        const role = match[2].toLowerCase()
        const startIndex = match.index! + match[0].length

        const nextMatch = matches[i + 1]
        const endIndex = nextMatch ? nextMatch.index : content.length

        const messageContent = content.slice(startIndex, endIndex).trim()
        if (!messageContent) continue

        const createdAt = parseHeaderDate(rawDate)

        await prisma.message.create({
          data: {
            role,
            content: messageContent,
            topicId: dbTopic.id,
            ...(createdAt ? { createdAt } : {}),
          },
        })
      }

      console.log(`✅ 已导入 ${matches.length} 条消息到主题 "${topicTitle}"`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
