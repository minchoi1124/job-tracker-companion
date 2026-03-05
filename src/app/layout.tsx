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
          <nav className="glass-panel" style={{ margin: '20px auto', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderRadius: '12px' }}>
            <Link href="/" style={{ fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'none', color: 'var(--foreground)' }} className="text-gradient">
              JobCompanion
            </Link>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {session ? (
                <>
                  <span className="text-muted" style={{ fontSize: '0.9rem' }}>{session.user?.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>Login</Link>
              )}
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}

