import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TopicDetail({ params }: PageProps) {
  // Await the params object before accessing its properties
  const { id } = await params;
  
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!topic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium"
          >
            ← 返回列表
          </Link>
          <h1 className="text-lg font-semibold truncate max-w-md" title={topic.title}>
            {topic.title}
          </h1>
          <div className="w-20" /> {/* 占位，保持标题居中 */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {topic.messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* 头像/角色标识 */}
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 font-bold text-xs">
                AI
              </div>
            )}

            <div 
              className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-800 border border-gray-100'
              }`}
            >
              {/* 角色标签 */}
              <div className={`text-xs mb-1 font-medium opacity-70 ${
                msg.role === 'user' ? 'text-blue-100 text-right' : 'text-purple-600'
              }`}>
                {msg.role === 'user' ? 'YOU' : 'AI ASSISTANT'}
              </div>

              {/* 内容渲染 */}
              <div className={`prose prose-sm max-w-none ${
                msg.role === 'user' ? 'prose-invert' : 'prose-slate'
              }`}>
                <MarkdownRenderer content={msg.content} />
              </div>
            </div>

            {/* 用户头像 */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
                ME
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
