'use client';
import * as React from 'react';
import UrgentAlertBanner from './UrgentAlertBanner';

// Alias wrapper — same global urgent-alert banner, alternate name used by some pages.
export default function SafetyBanner(_props: any) {
  return <UrgentAlertBanner/>;
}
