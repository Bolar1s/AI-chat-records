import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic'

export default async function Home() {
  const topics = await prisma.topic.findMany({
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">AI 学习笔记</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">共 {topics.length} 个主题</span>
            <SignOutButton />
          </div>
        </header>

        <div className="grid gap-4">
          {topics.map((topic) => (
            <div 
              key={topic.id} 
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{topic.title}</h2>
                <span className="text-xs text-gray-400">
                  {new Date(topic.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {topic.messages.length > 0 && (
                <p className="text-gray-600 line-clamp-2 text-sm">
                  {topic.messages[0].content.slice(0, 100)}...
                </p>
              )}
              
              <div className="mt-4 flex justify-end">
                <Link 
                  href={`/topic/${topic.id}`}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  查看详情 →
                </Link>
              </div>
            </div>
          ))}

          {topics.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
              暂无笔记，请运行导入脚本。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
