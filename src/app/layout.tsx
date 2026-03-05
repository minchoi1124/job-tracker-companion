import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from '@/components/SignOutButton'

export const metadata: Metadata = {
  title: 'Job Search Companion',
  description: 'Manage and track your job applications effortlessly.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="glass-panel" style={{ margin: '20px auto', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderRadius: '16px' }}>
            <Link href="/" style={{ fontSize: '1.4rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '-0.02em' }} className="text-gradient">
              JobCompanion
            </Link>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--foreground)' }}>{session.user?.name || 'User'}</span>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>{session.user?.email}</span>
                  </div>
                  <SignOutButton />
                </div>
              ) : (
                <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem', textDecoration: 'none', borderRadius: '40px' }}>Login</Link>
              )}
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}

