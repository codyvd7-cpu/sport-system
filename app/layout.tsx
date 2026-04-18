import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'High-Performance Operations',
  description: 'School sport high-performance operations system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <div className="min-h-screen bg-slate-950 text-white">
          <Nav />
          <div className="min-h-[calc(100vh-88px)]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}