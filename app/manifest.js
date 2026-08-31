export default function manifest() {
  return {
    id: "/accueil-v2",

    name: "So Fresh Click & Collect",
    short_name: "So Fresh",

    description:
      "Commandez votre repas So Fresh en Click & Collect.",

    start_url: "/accueil-v2",
    scope: "/",

    display: "standalone",
    orientation: "portrait",

    background_color: "#fbfbf9",
    theme_color: "#98bd12",

    lang: "fr",

    categories: ["food", "shopping"],

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
      },
      {
        src: "/screenshot-desktop.png",
        sizes: "1440x900",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}