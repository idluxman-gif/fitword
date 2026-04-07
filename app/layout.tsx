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
  themeColor: '#7C3AED',
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
      </head>
      <body className="bg-bg text-white antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
