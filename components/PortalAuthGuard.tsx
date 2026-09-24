'use client';
import * as React from 'react';

// The sport portal shows fixtures and results — public information, no code
// required. Anything personal sits behind a real account instead.
export default function PortalAuthGuard({ children }: { children: React.ReactNode; sport?: string }) {
  return <>{children}</>;
}
