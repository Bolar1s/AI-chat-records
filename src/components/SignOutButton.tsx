'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      className="text-sm font-medium text-gray-600 hover:text-gray-900"
      type="button"
      onClick={() => signOut({ callbackUrl: '/signin' })}
    >
      退出登录
    </button>
  )
}

