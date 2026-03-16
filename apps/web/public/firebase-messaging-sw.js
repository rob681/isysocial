// Firebase Cloud Messaging Service Worker
// This runs in the background to receive push notifications
// even when the app tab is not active.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config is injected at runtime via the query string
// from the main app when registering the service worker.
// Fallback: read from self.__FIREBASE_CONFIG if set.
let firebaseConfig = null;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    initFirebase(firebaseConfig);
  }
});

function initFirebase(config) {
  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    const data = payload.data || {};

    self.registration.showNotification(title || "Isysocial", {
      body: body || "Tienes una nueva notificación",
      icon: icon || "/logo-icon-color.svg",
      badge: "/logo-icon-color.svg",
      data: {
        url: data.url || "/notificaciones",
      },
    });
  });
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notificaciones";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If we have a window open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
