'use client';
import * as React from 'react';
import { useToast } from '@/components/Toast';

export default function NotificationBell() {
  const { showToast } = useToast();
  const [subscribed, setSubscribed] = React.useState(false);
  const [loading, setLoading]       = React.useState(false);
  const [supported, setSupported]   = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false); return;
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    ).catch(() => {});
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      if (!rawKey) { showToast('Push not configured.', 'error'); setLoading(false); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { showToast('Please allow notifications.', 'error'); setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;

      // Import the VAPID public key using Web Crypto API — no atob needed
      const keyData = Uint8Array.from(
        rawKey.replace(/-/g, '+').replace(/_/g, '/'),
        (c) => c.charCodeAt(0)
      );

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey,
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) { setSubscribed(true); showToast('Notifications enabled ✓'); }
      else { const d = await res.json(); showToast(`Failed: ${d.error}`, 'error'); }
    } catch (e: any) {
      console.error('[Push]', e);
      showToast(`Error: ${e.message}`, 'error');
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      showToast('Notifications disabled');
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
    setLoading(false);
  }

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? 'Notifications on — tap to disable' : 'Enable notifications'}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all"
      style={{
        background: subscribed ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${subscribed ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
        color: subscribed ? '#10b981' : 'rgba(255,255,255,0.5)',
      }}>
      {loading ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"/>
      ) : (
        <svg viewBox="0 0 24 24" fill={subscribed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )}
    </button>
  );
}