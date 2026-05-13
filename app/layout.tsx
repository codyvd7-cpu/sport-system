import type { Metadata } from 'next';
import './globals.css';
import RootLayoutClient from '@/components/RootLayoutClient';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: "St Benedict's Hockey",
  description: 'High-performance hockey operations platform',
  manifest: '/manifest.json',
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

function ServiceWorkerRegistration() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
  return null;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <ServiceWorkerRegistration />

        <ToastProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </ToastProvider>
      </body>
    </html>
  );
}