'use client';
import * as React from 'react';
export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen text-white" style={{background:'var(--bg)'}}>{children}</div>;
}
