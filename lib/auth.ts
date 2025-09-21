import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth-options'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/signin')
  }
  return user
}

export async function requireAdmin() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('[requireAdmin] No authenticated user found')
      redirect('/')
    }
    if (user.role !== 'admin') {
      console.log('[requireAdmin] User is not admin:', {
        userId: user.id,
        role: user.role,
      })
      redirect('/')
    }
    console.log('[requireAdmin] Admin access granted for user:', user.id)
    return user
  } catch (error) {
    console.error('[requireAdmin] Error during admin check:', error)
    redirect('/')
  }
}

export async function requireRole(role: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== role) {
    redirect('/')
  }
  return user
}
