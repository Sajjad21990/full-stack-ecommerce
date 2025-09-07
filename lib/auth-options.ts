import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import nodemailer from 'nodemailer'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1)
          .then((res) => res[0])

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'localhost',
        port: parseInt(process.env.EMAIL_SERVER_PORT || '1025'),
        auth: process.env.EMAIL_SERVER_USER
          ? {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            }
          : undefined,
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const otp = generateOTP()
        const { host } = new URL(url)
        
        const transport = nodemailer.createTransport(provider.server as any)
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to ${host}`,
          text: `Your OTP code is: ${otp}\n\nOr click this link to sign in: ${url}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Sign in to ${host}</h1>
              <p>Your OTP code is:</p>
              <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>Or click the link below to sign in:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 5px;">Sign in</a>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">If you didn't request this email, you can safely ignore it.</p>
            </div>
          `,
        })
        
        const failed = result.rejected.filter(Boolean)
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(', ')}) could not be sent`)
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string || 'customer'
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.email === process.env.ADMIN_EMAIL ? 'admin' : 'customer'
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
}