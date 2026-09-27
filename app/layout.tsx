import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/Toast';
import SplashScreen from '@/components/SplashScreen';
import QueryProvider from '@/components/QueryProvider';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import BrandingProvider from '@/components/BrandingProvider';
import './globals.css';
import UrgentAlertBanner from '@/components/UrgentAlertBanner';

export const metadata: Metadata = {
  title:       'Altus Performance',
  description: "Sport management platform for schools — performance, teams, fixtures and results.",
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
    description: "Sport management platform for schools — performance, teams, fixtures and results.",
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
    <html lang="en" style={{ background: "#050505" }}>
      <head>
        <link rel="apple-touch-icon" href="/altus-icon.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/altus-icon.png"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Altus"/>
        <meta name="mobile-web-app-capable" content="yes"/>
      </head>
      <body style={{overflowX:"hidden",maxWidth:"100vw"}}>
        <SplashScreen/>
        <ServiceWorkerRegistrar/>
        <QueryProvider>
          <BrandingProvider>
          <ToastProvider>
            {/* The lightning/urgent alert banner. This component was written
                months ago and rendered NOWHERE — activating an alert put a
                red banner in front of precisely nobody. For a feature whose
                only job is getting a weather warning to parents and coaches
                fast, silently doing nothing is the worst possible failure.
                Mounted at the root so it covers every page, which is what it
                was always designed for. */}
            <UrgentAlertBanner/>
            {children}
          </ToastProvider>
          </BrandingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
