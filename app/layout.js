import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata = {
  title: "So Fresh — Click & Collect",
  description: "Commandez votre repas So Fresh en ligne.",

  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/app-icon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}