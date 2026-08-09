export default function manifest() {
  return {
    name: "So Fresh Click & Collect",
    short_name: "So Fresh",
    description:
      "Commandez votre repas So Fresh en Click & Collect.",
    start_url: "/",
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
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}