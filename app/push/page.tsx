/**
 * Push notification subscription page.
 * Users can enable/disable daily devotional push notifications.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushSettingsPage() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert('Push notifications are not configured yet. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
        setLoading(false);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });

      const subJSON = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to subscribe on the server');
      }

      setSubscribed(true);
    } catch (err) {
      console.error('Subscription failed:', err);
      alert('Failed to subscribe to push notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error('Failed to unsubscribe on the server');
        }
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-2xl font-bold text-maroon-800 mb-4">Push Notifications</h1>
          <p className="text-gray-500">Your browser does not support push notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-gradient-to-br from-maroon-800 to-maroon-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">🔔 सूचना सेटिंग्ज</h1>
          <p className="text-sand-200 mt-2">Notification Settings</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-maroon-800 mb-2">Daily Abhang</h2>
            <p className="text-sm text-gray-600">
              Receive a daily push notification with a random abhang or devotional composition
              every morning.
            </p>
          </div>

          <button
            onClick={subscribed ? handleUnsubscribe : handleSubscribe}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : subscribed
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-saffron text-white hover:bg-saffron-600'
            }`}
          >
            {loading ? 'Please wait...' : subscribed ? 'Unsubscribe from Daily Notifications' : 'Subscribe to Daily Notifications'}
          </button>

          <div className="text-xs text-gray-400 space-y-1">
            <p>🛡️ Your subscription is private and stored securely.</p>
            <p>🔕 You can unsubscribe at any time.</p>
            <p>📱 Compatible with Chrome, Firefox, Edge, and Samsung Internet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
