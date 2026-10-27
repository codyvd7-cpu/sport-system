'use client';
import * as React from 'react';

// ─── NativeShell ──────────────────────────────────────────────────────────────
// Native-only behaviours for when the web app runs inside the Capacitor shell.
// Does nothing on the plain website.
//
// Fixes the "there's no way back" problem: a WebView doesn't wire Android's
// hardware back button (or the back gesture) to page navigation on its own.
// Here we catch the back event and:
//   • go back through the app's own history if there's somewhere to go, else
//   • ask for a second press within 2s to exit — the standard Android pattern,
//     instead of dumping the user straight to the home screen.
//
// Reaches the App plugin through the runtime Capacitor global, never an import,
// so the web build never tries to resolve @capacitor/app.

function toast(message: string) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = message;
  el.setAttribute('role', 'status');
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
    transform: 'translateX(-50%)', zIndex: '2147483647',
    background: 'rgba(14,17,22,0.95)', color: '#F4F1EA',
    font: '600 13px/1 -apple-system, system-ui, sans-serif',
    padding: '12px 20px', borderRadius: '999px',
    border: '1px solid rgba(244,241,234,0.14)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    pointerEvents: 'none', opacity: '0', transition: 'opacity .2s ease',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 1600);
}

export default function NativeShell() {
  React.useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const App = cap.Plugins?.App;
    if (!App?.addListener) return;

    let lastBack = 0;
    let handle: any;

    const onBack = (e: { canGoBack?: boolean }) => {
      const canGoBack = e?.canGoBack ?? (window.history.length > 1);
      // If a modal/overlay is open the app may prefer to close it first; we let
      // normal history handle that (most overlays push a history entry or are
      // dismissed by the page). Otherwise:
      if (canGoBack) {
        window.history.back();
        return;
      }
      const now = Date.now();
      if (now - lastBack < 2000) {
        App.exitApp?.();
      } else {
        lastBack = now;
        toast('Press back again to exit');
      }
    };

    const reg = App.addListener('backButton', onBack);
    // addListener may return a handle or a promise of one, depending on version.
    Promise.resolve(reg).then((h) => { handle = h; }).catch(() => {});

    return () => { try { handle?.remove?.(); } catch { /* noop */ } };
  }, []);

  return null;
}
