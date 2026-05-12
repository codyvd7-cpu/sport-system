import type { Metadata } from 'next';
import './globals.css';
import RootLayoutClient from '@/components/RootLayoutClient';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'St Benedict\'s Hockey',
  description: 'High-performance hockey operations platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <ToastProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </ToastProvider>
      </body>
    </html>
  );
}
