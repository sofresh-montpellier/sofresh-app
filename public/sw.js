self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "So Fresh",
      body: event.data
        ? event.data.text()
        : "Nouvelle notification",
    };
  }

  const title = data.title || "So Fresh";

  const options = {
    body:
      data.body ||
      "Nouvelle notification So Fresh",

    icon: "/icon-192.png",

    badge: "/icon-192.png",

    data: {
      url: data.url || "/admin",
    },
  };

  const badgeCount = Math.max(
    1,
    Number(data.badgeCount || 1)
  );

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        title,
        options
      ),

      "setAppBadge" in self.navigator
        ? self.navigator.setAppBadge(
            badgeCount
          )
        : Promise.resolve(),
    ])
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification.data?.url ||
      "/admin";

    event.waitUntil(
      clients.openWindow(url)
    );
  }
);