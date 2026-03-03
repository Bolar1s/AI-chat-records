import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getRequiredEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function listMigrationSqlFiles() {
  const migrationsDir = path.resolve(__dirname, '../prisma/migrations')
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

  return dirs.map((dir) => path.join(migrationsDir, dir, 'migration.sql'))
}

async function main() {
  const url = getRequiredEnv('TURSO_DATABASE_URL')
  const authToken = getRequiredEnv('TURSO_AUTH_TOKEN')

  const client = createClient({ url, authToken })
  const sqlFiles = listMigrationSqlFiles()

  for (const sqlFile of sqlFiles) {
    const sql = fs.readFileSync(sqlFile, 'utf8').trim()
    if (!sql) continue
    await client.executeMultiple(sql)
    process.stdout.write(`Applied: ${path.basename(path.dirname(sqlFile))}\n`)
  }

  client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
