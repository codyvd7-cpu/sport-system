import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/Toast';
import SplashScreen from '@/components/SplashScreen';
import './globals.css';

export const metadata: Metadata = {
  title:       'Altus Performance',
  description: "St Benedict's College High Performance Platform",
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:       true,
    statusBarStyle:'black-translucent',
    title:         'Altus',
    startupImage:  '/altus-icon.png',
  },
  icons: {
    icon:  '/altus-icon.png',
    apple: '/altus-icon.png',
    shortcut: '/altus-icon.png',
  },
  openGraph: {
    title:       'Altus Performance',
    description: "St Benedict's College — High Performance Sport Platform",
    siteName:    'Altus Performance',
  },
};

export const viewport: Viewport = {
  themeColor:        '#070c1a',
  width:             'device-width',
  initialScale:      1,
  maximumScale:      1,
  userScalable:      false,
  viewportFit:       'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/altus-icon.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/altus-icon.png"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Altus"/>
        <meta name="mobile-web-app-capable" content="yes"/>
      </head>
      <body>
        <SplashScreen/>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
