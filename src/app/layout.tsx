import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'
import Nav from '@/components/shared/Nav'
import BottomNav from '@/components/shared/BottomNav'
import StarField from '@/components/shared/StarField'
import Footer from '@/components/shared/Footer'
import { LanguageProvider } from '@/contexts/LanguageContext'

const notoSans = Noto_Sans_Georgian({
  subsets: ['georgian'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0B1A',
}

export const metadata: Metadata = {
  title: 'Skywatcher — ცა ერთი შეხედვით',
  description: 'საქართველოს ასტრომანთა პლატფორმა. ჩაწერე დაკვირვებები, შეასრულე მისიები, გახდი ლიდერი.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Skywatcher' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoSans.className}>
      <body className="min-h-screen flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <LanguageProvider>
          {/* Background layers */}
          <StarField />
          <div className="fixed top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 blur-[120px] mix-blend-screen z-0 pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[120px] mix-blend-screen z-0 pointer-events-none" />

          <Nav />
          <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
          <Footer />
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  )
}
