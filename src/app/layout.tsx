import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/shared/Nav'
import BottomNav from '@/components/shared/BottomNav'
import StarField from '@/components/shared/StarField'
import Footer from '@/components/shared/Footer'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070B14',
}

export const metadata: Metadata = {
  title: 'Sky Astroman — Strava for Astronomy',
  description: 'Observe the night sky, log missions, earn points, compete with fellow stargazers.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Sky Astroman' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <StarField />
        <Nav />
        <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  )
}
