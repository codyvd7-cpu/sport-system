'use client';
import * as React from 'react';
import UrgentAlertBanner from './UrgentAlertBanner';
export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen text-white" style={{background:'var(--bg)'}}><UrgentAlertBanner/>{children}</div>;
}
