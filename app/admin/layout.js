"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setReady(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return <main className="admin-wrap">Vérification de la connexion…</main>;
  }

  return (
    <>
      <header className="admin-navigation">
        <div className="brand">
          SO <span>FRESH</span>
        </div>

        <nav>
          <Link href="/admin" className={pathname === "/admin" ? "active" : ""}>
            Commandes
          </Link>

          <Link
            href="/admin/products"
            className={pathname.startsWith("/admin/products") ? "active" : ""}
          >
            Produits
          </Link>

          <Link
            href="/admin/settings"
            className={pathname.startsWith("/admin/settings") ? "active" : ""}
          >
            Paramètres
          </Link>
        </nav>

        <button className="secondary admin-logout" onClick={logout}>
          Déconnexion
        </button>
      </header>

      {children}
    </>
  );
}
