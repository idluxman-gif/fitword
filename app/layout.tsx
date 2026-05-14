import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegister } from './sw-register'

export const metadata: Metadata = {
  title: 'xActo — משחק מילים',
  description: 'משחק מילים בעברית — מלא את השורה!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'xActo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#fb7185',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Sora:wght@600;700;800;900&family=Bungee&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-white antialiased font-heebo">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
