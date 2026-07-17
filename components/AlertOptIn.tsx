'use client';
import * as React from 'react';
import PushAlerts from './PushAlerts';

// Alias wrapper — same push opt-in button, alternate name used by some pages.
export default function AlertOptIn(props: any) {
  return <PushAlerts {...props}/>;
}
