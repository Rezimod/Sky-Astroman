import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/layout/Navigation'
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
  themeColor: '#06080F',
}

export const metadata: Metadata = {
  title: 'Stellar — ცა ერთი შეხედვით',
  description: 'საქართველოს ვარსკვლავმოყვარეთა პლატფორმა. ჩაწერე დაკვირვებები, შეასრულე მისიები, გახდი ლიდერი.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Stellar' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoSans.className}>
      <body className="min-h-screen flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <LanguageProvider>
          <StarField />

          <Navigation />
          <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
