
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// 确保能读取 .env
dotenv.config();

const prisma = new PrismaClient();

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 你的 Markdown 文件夹路径
// 假设脚本在 scripts/ 目录，那么 Markdown 在上上级目录
const NOTES_DIR = path.resolve(__dirname, "../../"); 

// 正则表达式：匹配 ## [日期] User/Assistant
// 示例：## [2026-03-02] User
const HEADER_REGEX = /^##\s+\[(.*?)\]\s+(User|Assistant)\s*$/gm;

async function main() {
  console.log(`🚀 开始扫描目录: ${NOTES_DIR}`);

  const files = fs.readdirSync(NOTES_DIR).filter((file) => file.endsWith(".md") && /^\d{4}-\d{2}-\d{2}\.md$/.test(file));

  if (files.length === 0) {
    console.log("⚠️  未找到符合格式 (YYYY-MM-DD.md) 的 Markdown 文件");
    return;
  }

  console.log(`📂 找到 ${files.length} 个文件:`, files);

  for (const file of files) {
    const filePath = path.join(NOTES_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    
    // 使用文件名作为 Topic 标题，例如 "2026-03-02"
    const topicTitle = file.replace(".md", "");

    console.log(`\n📄 处理文件: ${file}`);

    // 1. 创建或查找 Topic
    // upsert: 如果存在则更新（这里只更新时间），不存在则创建
    await prisma.topic.upsert({
      where: { id: topicTitle }, // 这里我们暂时用文件名当 ID，方便去重，或者你可以查一下是否已存在
      // 注意：Prisma Schema 里的 id 是 uuid，所以不能直接用 topicTitle 当 id 查找，
      // 除非我们在 Schema 里把 title 设为 unique，或者先 findFirst。
      // 为了简单起见，我们先用 findFirst 查找 title
      update: {},
      create: {
        title: topicTitle,
      },
    }).catch(async () => {
       // 如果 upsert 失败（因为我们没用 id 查找），就手动查一下
       let t = await prisma.topic.findFirst({ where: { title: topicTitle } });
       if (!t) {
         t = await prisma.topic.create({ data: { title: topicTitle } });
       }
       return t;
    });
    
    // 更正：上面的 upsert 逻辑有瑕疵，因为 id 是 uuid。
    // 正确逻辑：按标题查找，没有就创建
    let dbTopic = await prisma.topic.findFirst({ where: { title: topicTitle } });
    if (!dbTopic) {
      dbTopic = await prisma.topic.create({
        data: { title: topicTitle },
      });
      console.log(`✅ 创建新主题: ${topicTitle}`);
    } else {
      console.log(`ℹ️  主题已存在: ${topicTitle} (ID: ${dbTopic.id})`);
    }

    // 2. 解析内容并提取消息
    // 我们需要把文件按 Header 切分
    // matchAll 返回一个迭代器
    const matches = [...content.matchAll(HEADER_REGEX)];
    
    if (matches.length === 0) {
        console.log(`⚠️  文件 ${file} 中未找到符合格式的消息块`);
        continue;
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const role = match[2].toLowerCase(); // "user" or "assistant"
      const startIndex = match.index! + match[0].length;
      
      // 结束索引是下一个 match 的开始，或者是文件末尾
      const nextMatch = matches[i + 1];
      const endIndex = nextMatch ? nextMatch.index : content.length;
      
      const messageContent = content.slice(startIndex, endIndex).trim();

      // 跳过空消息
      if (!messageContent) continue;

      // 存入数据库
      // 为了防止重复导入，可以先检查内容是否一样（可选，这里先简单粗暴直接存，或者删除旧的）
      // 简单策略：先全部存进去，以后再考虑去重。
      // 或者：每次导入前清空该 Topic 下的消息？这样比较安全。
      
      // 这里采用：追加模式。
      
      await prisma.message.create({
        data: {
            role: role,
            content: messageContent,
            topicId: dbTopic.id
        }
      });
    }
    console.log(`✅ 已导入 ${matches.length} 条消息到主题 "${topicTitle}"`);
  }
}

// 运行前先清空旧数据（可选，防止重复）
// await prisma.message.deleteMany({});
// await prisma.topic.deleteMany({});

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
