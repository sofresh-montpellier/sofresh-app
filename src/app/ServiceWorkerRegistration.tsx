"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const enregistrerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error(
          "Impossible d'enregistrer le service worker Feuillia :",
          error
        );
      }
    };

    enregistrerServiceWorker();
  }, []);

  return null;
}