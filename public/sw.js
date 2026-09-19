self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Feuillia",
      body: event.data ? event.data.text() : "Nouvelle notification",
    };
  }

  const title = data.title || "Feuillia";

  const options = {
    body: data.body || "Une nouvelle information vous attend.",
    icon: "/logo_feuilla.png",
    badge: "/logo_feuilla.png",
    data: {
      url: data.url || "/aujourdhui",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/aujourdhui";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});