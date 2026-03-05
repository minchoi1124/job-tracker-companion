import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from '@/components/SignOutButton'
import { User as UserIcon, LayoutDashboard, Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Job Tracker Companion',
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
          {session && (
            <nav style={{
              margin: '24px auto',
              maxWidth: '1200px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '0 2rem'
            }}>
              <div className="glass-panel" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '8px 8px 8px 16px',
                borderRadius: '100px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--foreground)',
                      lineHeight: '1.2'
                    }}>
                      {session.user?.name || 'User'}
                    </span>
                    <span className="text-muted" style={{
                      fontSize: '0.7rem',
                      opacity: 0.7
                    }}>
                      {session.user?.email}
                    </span>
                  </div>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--info))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 0 15px rgba(138, 43, 226, 0.3)'
                  }}>
                    <UserIcon size={20} />
                  </div>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />
                <SignOutButton />
              </div>
            </nav>
          )}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}

