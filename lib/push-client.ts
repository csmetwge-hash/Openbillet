'use client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push not supported in this browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission denied.' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });

  if (!res.ok) {
    const { error } = await res.json();
    return { success: false, error };
  }
  return { success: true };
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Not supported in this browser.' };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return { success: true };
  }

  const endpoint = subscription.endpoint;

  const res = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  await subscription.unsubscribe();

  if (!res.ok) {
    const { error } = await res.json();
    return { success: false, error };
  }
  return { success: true };
}

export async function checkPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}