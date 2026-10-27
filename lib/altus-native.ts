// ─── lib/altus-native.ts ──────────────────────────────────────────────────────
// The bridge that lets the web app use native features when it runs inside the
// Capacitor shell, and quietly do nothing on the plain website.
//
// IMPORTANT: this reaches native plugins through the global `Capacitor.Plugins`
// object at RUNTIME, never by importing the plugin packages (capacitor-health,
// @capacitor/push-notifications). Those packages live only in the native shell,
// not in the web app's node_modules — importing them would break the web build.
// Going through the global keeps the web build clean while still working in the
// app.

type Caps = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
};
function cap(): Caps | null {
  if (typeof window === 'undefined') return null;
  return (window as any).Capacitor || null;
}

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.();
}
export function nativePlatform(): 'ios' | 'android' | 'web' {
  return (cap()?.getPlatform?.() as any) || 'web';
}

// ── Health data pull (Apple Health / Google Health Connect) ─────────────────────
// Reads the athlete's recent workouts from the phone's health store and posts
// them to /api/athlete/health (which scopes them to the signed-in athlete).
// Web is a no-op — a browser can't read HealthKit / Health Connect.
export async function syncHealth(
  getAuthToken: () => Promise<string | null>,
): Promise<{ imported: number } | { error: string }> {
  if (!isNativeApp()) return { error: 'Only available in the Altus app.' };
  const Health = cap()?.Plugins?.Health;
  if (!Health) return { error: 'Health isn’t enabled in this app build yet.' };

  try {
    const avail = await Health.isHealthAvailable();
    if (!avail?.available) return { error: 'Health data isn’t available on this device.' };

    await Health.requestHealthPermissions({
      permissions: ['READ_WORKOUTS', 'READ_HEART_RATE', 'READ_DISTANCE', 'READ_STEPS', 'READ_CALORIES'],
    });

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 70 * 86400000).toISOString();
    const res = await Health.queryWorkouts({ startDate, endDate, includeHeartRate: true, includeRoute: false, includeSteps: true });
    const workouts: any[] = res?.workouts || [];
    if (!workouts.length) return { imported: 0 };

    const activities = workouts.map(w => ({
      workoutType: w.workoutType,
      startDate: w.startDate, endDate: w.endDate,
      duration: w.duration, distance: w.distance, calories: w.calories,
      heartRate: w.heartRate,
    }));

    const token = await getAuthToken();
    const r = await fetch('/api/athlete/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ source: nativePlatform() === 'ios' ? 'apple_health' : 'health_connect', activities }),
    });
    const d = await r.json();
    if (!r.ok) return { error: d.error || 'Sync failed.' };
    return { imported: d.imported || 0 };
  } catch (e: any) {
    return { error: e?.message || 'Could not sync health data.' };
  }
}
