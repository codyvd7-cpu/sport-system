import type { Metadata } from 'next';
import './globals.css';
import RootLayoutClient from '@/components/RootLayoutClient';
import { ToastProvider } from '@/components/Toast';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import QueryProvider from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: "Kinetiq Sport",
  description: 'High-performance sport operations platform for St Benedict\'s College.',
  manifest: '/manifest.json',
  openGraph: {
    title: "Kinetiq Sport",
    description: 'High-performance sport operations platform for St Benedict\'s College.',
    url: 'https://kinetiqsport.co.za',
    siteName: "Kinetiq Sport",
    images: [{ url: '/sbc-photo-1.jpg', width: 1200, height: 630, alt: "St Benedict's College" }],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Kinetiq Sport",
    description: 'High-performance sport operations platform for St Benedict\'s College.',
    images: ['/sbc-photo-1.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Kinetiq Sport",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#0ea5e9',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white antialiased" style={{background:'var(--bg)',fontFamily:'var(--font-sans)'}} suppressHydrationWarning>
        <ServiceWorkerRegistrar/>
        <QueryProvider>
          <ToastProvider>
            <RootLayoutClient>{children}</RootLayoutClient>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
