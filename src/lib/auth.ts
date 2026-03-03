import type { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email
        const rawPassword = credentials?.password

        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
        const password = typeof rawPassword === 'string' ? rawPassword : ''

        if (!email || !password) return null

        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
          const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
          const adminPassword = process.env.ADMIN_PASSWORD

          if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
            const hasAnyUser = await prisma.user.findFirst()
            if (!hasAnyUser) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: 'Admin',
                  passwordHash: await bcrypt.hash(password, 10),
                },
              })
            }
          }
        }

        if (!user?.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
}

export default NextAuth(authOptions)
