'use client';
import * as React from 'react';
import { useToast } from '@/components/Toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationBell() {
  const { showToast } = useToast();
  const [status, setStatus]       = React.useState<'unknown'|'granted'|'denied'|'unsupported'>('unknown');
  const [subscribed, setSubscribed] = React.useState(false);
  const [loading, setLoading]     = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    setStatus(Notification.permission as any);
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    );
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      if (!vapidKey) {
        showToast('VAPID key not configured.', 'error');
        setLoading(false); return;
      }
      if (!('Notification' in window)) {
        showToast('Notifications not supported.', 'error');
        setLoading(false); return;
      }

      const permission = await Notification.requestPermission();
      setStatus(permission as any);
      if (permission !== 'granted') {
        showToast('Allow notifications in browser settings.', 'error');
        setLoading(false); return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) { setSubscribed(true); showToast('Notifications enabled ✓'); }
      else { const d = await res.json(); showToast(`Failed: ${d.error}`, 'error'); }
    } catch (e: any) {
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

  if (status === 'unsupported') return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || status === 'denied'}
      title={
        status === 'denied'  ? 'Blocked in browser settings' :
        subscribed           ? 'Notifications on — tap to disable' :
        'Enable notifications'
      }
      className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all"
      style={{
        background: subscribed ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${subscribed ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
        color: subscribed ? '#10b981' : status === 'denied' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
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