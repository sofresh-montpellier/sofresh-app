"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
} from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function formatPickupDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatPickupTime(value) {
  return String(value || "")
    .replace(/\s*h\s*/i, " h ")
    .trim();
}

export default function ComptePage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  async function loadOrders(userId) {
    if (!supabase || !userId) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        pickup_date,
        pickup_time,
        total,
        status,
        created_at
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Erreur chargement historique commandes :",
        error
      );

      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setOrders(data || []);
    setLoadingOrders(false);
  }

  useEffect(() => {
    async function loadUser() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentUser = user || null;

      setUser(currentUser);

      if (currentUser) {
        await loadOrders(currentUser.id);
      } else {
        setOrders([]);
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user || null;

        setUser(currentUser);

        if (currentUser) {
          await loadOrders(currentUser.id);
        } else {
          setOrders([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setUser(null);
    setOrders([]);
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-container">
          <h1>Mon compte</h1>

          <p className="account-intro">
            Chargement de votre compte...
          </p>
        </div>
      </main>
    );
  }

  if (user) {
    const firstName =
      user.user_metadata?.first_name || "";

    const lastName =
      user.user_metadata?.last_name || "";

    const phone =
      user.user_metadata?.phone || "";

    return (
      <main className="account-page">
        <div className="account-container">
          <h1>Mon compte</h1>

          <p className="account-intro">
            {firstName
              ? `Bonjour ${firstName} 👋`
              : "Bienvenue chez So Fresh 👋"}
          </p>

          <div className="account-benefits">
            <h2>Mes informations</h2>

            <div className="account-benefit">
              <span className="account-benefit-icon">
                👤
              </span>

              <div>
                <strong>
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : "Mon profil"}
                </strong>

                <p>{user.email}</p>
              </div>
            </div>

            {phone && (
              <div className="account-benefit">
                <span className="account-benefit-icon">
                  ☎
                </span>

                <div>
                  <strong>Téléphone</strong>
                  <p>{phone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="account-orders">
  <h2>Mes commandes</h2>

  {loadingOrders && (
    <p className="account-intro">
      Chargement de vos commandes...
    </p>
  )}

  {!loadingOrders && orders.length === 0 && (
    <p className="account-intro">
      Vous n’avez pas encore de commande.
    </p>
  )}

  {!loadingOrders &&
    orders.map((order) => (
      <div className="account-order-card" key={order.id}>
        <div className="account-order-top">
          <span className="account-order-title">
            {order.status === "Nouvelle"
              ? "Commande en cours"
              : "Commande"}
          </span>

          <span className="account-order-status">
            {order.status === "Nouvelle"
              ? "Reçue"
              : order.status || "Reçue"}
          </span>
        </div>

        <div className="account-order-label">
          Retrait
        </div>

        <div className="account-order-pickup">
          {formatPickupDate(order.pickup_date)} ·{" "}
          {formatPickupTime(order.pickup_time)}
        </div>

        <div className="account-order-bottom">
          <span className="account-order-total-label">
            Total
          </span>

          <span className="account-order-total">
            {euro(order.total)}
          </span>
        </div>
      </div>
    ))}
</div>

          <div className="account-actions">
            <Link
              href="/commander"
              className="account-login-btn"
            >
              Commander
            </Link>

            <button
              type="button"
              className="account-create-btn"
              onClick={handleLogout}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <h1>Mon compte</h1>

        <p className="account-intro">
          Connectez-vous ou créez votre compte So Fresh
        </p>

        <div className="account-actions">
          <Link
            href="/compte/connexion"
            className="account-login-btn"
          >
            Se connecter
          </Link>

          <Link
            href="/compte/inscription"
            className="account-create-btn"
          >
            Créer mon compte
          </Link>
        </div>

        <div className="account-benefits">
          <h2>Pourquoi créer un compte ?</h2>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3 6 6.5 1-4.75 4.6 1.1 6.4L12 17l-5.85 3 1.1-6.4L2.5 9 9 8l3-6z" />
              </svg>
            </span>

            <div>
              <strong>
                Profitez de votre fidélité
              </strong>

              <p>
                Retrouvez vos avantages fidélité.
              </p>
            </div>
          </div>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            </span>

            <div>
              <strong>
                Commandez plus rapidement
              </strong>

              <p>
                Retrouvez vos informations lors de vos
                prochaines commandes.
              </p>
            </div>
          </div>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12a9 9 0 1 1-5.3-8.2" />
              </svg>
            </span>

            <div>
              <strong>
                Retrouvez vos commandes
              </strong>

              <p>
                Consultez facilement votre historique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}