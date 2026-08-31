self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "So Fresh",
      body: event.data ? event.data.text() : "Nouvelle notification",
    };
  }

  const title = data.title || "So Fresh";

  const options = {
    body: data.body || "Nouvelle notification So Fresh",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: data.url || "/admin",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification.data?.url || "/admin";

  event.waitUntil(
    clients.openWindow(url)
  );
});