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

function isFutureOrder(order) {
  if (!order.pickup_date || !order.pickup_time) {
    return false;
  }

  const time = String(order.pickup_time)
    .replace(" h ", ":")
    .replace("h", ":")
    .trim();

  const pickupDateTime = new Date(
    `${order.pickup_date}T${time}`
  );

  return pickupDateTime > new Date();
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
      .select(`
        id,
        order_number,
        pickup_date,
        pickup_time,
        total,
        status,
        payment_status,
        created_at
      `)
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

    /*
     * Fidélité
     * Une commande compte si :
     * - elle appartient au client connecté
     * - elle est réellement payée
     * - son total est supérieur ou égal à 10 €
     */
    const loyaltyEligibleOrders = orders.filter(
      (order) =>
        order.payment_status === "paid" &&
        Number(order.total || 0) >= 10
    );

    const loyaltyCount = loyaltyEligibleOrders.length;

    const loyaltyProgress = Math.min(
      loyaltyCount,
      10
    );

    const loyaltyUnlocked = loyaltyCount >= 10;

    const loyaltyRemaining = Math.max(
      10 - loyaltyCount,
      0
    );

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

          {/* FIDÉLITÉ */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(152, 189, 18, 0.45)",
              borderRadius: "18px",
              padding: "16px",
              marginTop: "14px",
              marginBottom: "14px",
              boxShadow:
                "0 6px 18px rgba(90, 127, 13, 0.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: "#183D1F",
                  }}
                >
                  Ma fidélité
                </h2>

                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "12px",
                    color: "#6B715F",
                  }}
                >
                  Achats de 10 € minimum
                </p>
              </div>

              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  background: "#FFD400",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="#5A7F0D"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l3 6 6.5 1-4.75 4.6 1.1 6.4L12 17l-5.85 3 1.1-6.4L2.5 9 9 8l3-6z" />
                </svg>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#5A7F0D",
                  fontSize: "22px",
                }}
              >
                {loyaltyProgress} / 10
              </strong>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: loyaltyUnlocked
                    ? "#5A7F0D"
                    : "#6B715F",
                }}
              >
                {loyaltyUnlocked
                  ? "Avantage débloqué"
                  : `${loyaltyRemaining} restant${
                      loyaltyRemaining > 1 ? "s" : ""
                    }`}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(10, minmax(0, 1fr))",
                gap: "5px",
                marginBottom: "12px",
              }}
            >
              {Array.from({ length: 10 }).map(
                (_, index) => (
                  <div
                    key={index}
                    style={{
                      height: "9px",
                      borderRadius: "999px",
                      background:
                        index < loyaltyProgress
                          ? "#98BD12"
                          : "#E8ECD8",
                    }}
                  />
                )
              )}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.45,
                color: "#4F5548",
              }}
            >
              {loyaltyUnlocked
                ? "Votre avantage fidélité de 50 % est débloqué."
                : `Encore ${loyaltyRemaining} achat${
                    loyaltyRemaining > 1 ? "s" : ""
                  } de 10 € minimum avant votre avantage de 50 %.`}
            </p>
          </div>

          <div className="account-orders account-orders-compact">

            <div className="account-orders-header">
              <h2>Mon historique de commandes</h2>

              <Link
                href="/compte/commandes"
                className="account-orders-all-link"
              >
                Voir tout →
              </Link>
            </div>

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
              orders.slice(0, 3).map((order) => (
                <Link
                  href={`/compte/commandes/${order.id}`}
                  className="account-order-line"
                  key={order.id}
                >
                  <div className="account-order-line-main">

                    <div>
                      <strong>
                        Commande{" "}
                        <span className="account-order-number">
                          SF-{order.order_number}
                        </span>
                      </strong>

                      <p>
                        {formatPickupDate(order.pickup_date)}
                        {" · "}
                        {formatPickupTime(order.pickup_time)}
                      </p>
                    </div>

                    <div className="account-order-line-right">

                      <span
                        className={`account-order-mini-status ${
                          isFutureOrder(order)
                            ? "future"
                            : "finished"
                        }`}
                      >
                        {isFutureOrder(order)
                          ? "À venir"
                          : "Terminée"}
                      </span>

                      <strong>
                        {euro(order.total)}
                      </strong>

                    </div>
                  </div>
                </Link>
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

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop:
                "1px solid rgba(90, 127, 13, 0.18)",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              fontSize: "11px",
            }}
          >
            <Link
              href="/mentions-legales"
              style={{
                color: "#5A7F0D",
                textDecoration: "none",
              }}
            >
              Mentions légales
            </Link>

            <Link
              href="/confidentialite"
              style={{
                color: "#5A7F0D",
                textDecoration: "none",
              }}
            >
              Politique de confidentialité
            </Link>
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

      <div
        style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop:
            "1px solid rgba(90, 127, 13, 0.18)",
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "11px",
        }}
      >
        <Link
          href="/mentions-legales"
          style={{
            color: "#5A7F0D",
            textDecoration: "none",
          }}
        >
          Mentions légales
        </Link>

        <Link
          href="/confidentialite"
          style={{
            color: "#5A7F0D",
            textDecoration: "none",
          }}
        >
          Politique de confidentialité
        </Link>
      </div>
    </main>
  );
}