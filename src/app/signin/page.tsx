'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const errorText = useMemo(() => {
    const error = searchParams.get('error')
    if (!error) return ''
    if (error === 'CredentialsSignin') return '邮箱或密码不正确'
    return '登录失败，请重试'
  }, [searchParams])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">登录</h1>
        <p className="text-sm text-gray-500 mt-1">请输入管理员账号进行访问</p>

        {errorText ? (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
            {errorText}
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            try {
              await signIn('credentials', {
                email,
                password,
                callbackUrl: '/',
              })
            } finally {
              setLoading(false)
            }
          }}
        >
          <label className="block">
            <span className="text-sm text-gray-700">邮箱</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">密码</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </main>
  )
}

