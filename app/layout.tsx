import type { Metadata } from 'next';
import './globals.css';
import RootLayoutClient from '@/components/RootLayoutClient';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: "St Benedict's College — High Performance",
  description: 'High-performance sport operations platform for St Benedict\'s College.',
  manifest: '/manifest.json',
  openGraph: {
    title: "St Benedict's College — High Performance",
    description: 'High-performance sport operations platform for St Benedict\'s College.',
    url: 'https://sport-system-rosy.vercel.app',
    siteName: "SBC High Performance",
    images: [{ url: '/sbc-photo-1.jpg', width: 1200, height: 630, alt: "St Benedict's College" }],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "St Benedict's College — High Performance",
    description: 'High-performance sport operations platform for St Benedict\'s College.',
    images: ['/sbc-photo-1.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "SBC Hockey",
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
      <body className="min-h-screen bg-slate-950 text-white antialiased" suppressHydrationWarning>

        <ToastProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </ToastProvider>
      </body>
    </html>
  );
}
