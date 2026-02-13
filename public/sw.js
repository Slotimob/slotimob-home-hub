// Push Notification Handler
// This file is loaded by the Workbox-generated SW via importScripts.
// It ONLY handles push notifications — all caching is managed by Workbox.

self.addEventListener('push', function(event) {
  var data = {
    title: 'Sloti',
    body: 'Você tem uma nova notificação',
    icon: '/sloti-logo.png',
    badge: '/sloti-logo.png',
    tag: 'notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      var payload = event.data.json();
      data = Object.assign({}, data, payload);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [100, 50, 100],
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
