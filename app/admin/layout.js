"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  ShoppingBasket,
  Settings,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

function parisTodayIso() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [futureOrdersCount, setFutureOrdersCount] =
    useState(0);

  async function loadFutureOrdersCount() {
    const today = parisTodayIso();

    const { count, error } = await supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte("pickup_date", today)
      .not("status", "in", '("Terminée","Annulée")');

    if (error) {
      console.error(
        "Erreur compteur commandes :",
        error
      );
      return;
    }

    setFutureOrdersCount(count || 0);
  }

  async function verifyAdmin(session) {
    if (!session?.user) {
      router.replace("/login");
      return false;
    }

    const user = session.user;

    const metadata =
      user.user_metadata || {};

    const appMetadata =
      user.app_metadata || {};

    const role =
      appMetadata.role ||
      metadata.role ||
      "";

    if (role !== "admin") {
      console.warn(
        "Accès administration refusé : utilisateur non admin"
      );

      router.replace("/compte");
      return false;
    }

    return true;
  }

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const isAdmin =
        await verifyAdmin(session);

      if (!isAdmin) {
        return;
      }

      setReady(true);
      loadFutureOrdersCount();
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const isAdmin =
          await verifyAdmin(session);

        if (!isAdmin) {
          setReady(false);
          return;
        }

        setReady(true);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const channel = supabase
      .channel("admin-orders-counter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadFutureOrdersCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="admin-loading">
        Vérification de l'accès administrateur…
      </main>
    );
  }

  return (
    <>
      <header className="sf-admin-header">
        <Link
          href="/admin"
          className="sf-admin-logo-link"
        >
          <Image
            src="/logo-sofresh.png"
            alt="So Fresh Salade"
            width={360}
            height={140}
            priority
            className="sf-admin-logo"
          />
        </Link>

        <div className="sf-admin-separator" />

        <nav className="sf-admin-nav">
          <Link
            href="/admin"
            className={
              pathname === "/admin" ? "active" : ""
            }
          >
            <ShoppingCart
              className="sf-nav-icon"
              size={21}
              strokeWidth={2}
              aria-hidden="true"
            />

            Commandes ({futureOrdersCount})
          </Link>

          <Link
            href="/admin/products"
            className={
              pathname.startsWith("/admin/products")
                ? "active"
                : ""
            }
          >
            <ShoppingBasket
              className="sf-nav-icon"
              size={21}
              strokeWidth={2}
              aria-hidden="true"
            />

            Produits
          </Link>

          <Link
            href="/admin/settings"
            className={
              pathname.startsWith("/admin/settings")
                ? "active"
                : ""
            }
          >
            <Settings
              className="sf-nav-icon"
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />

            Paramètres
          </Link>
        </nav>

        <div className="sf-admin-actions">
          <Link
            href="/"
            target="_blank"
            className="sf-admin-logout"
            style={{
              textDecoration: "none",
            }}
          >
            Voir le site
          </Link>

          <button
            type="button"
            className="sf-admin-logout"
            onClick={logout}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {children}
    </>
  );
}