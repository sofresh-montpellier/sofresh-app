"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function formatPickupDate(value) {
  if (!value) return "";

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

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

function RenewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M19 3v6" />
      <path d="M16 6h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function CommandesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (
        !isSupabaseConfigured ||
        !supabase
      ) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          pickup_date,
          pickup_time,
          total,
          status,
          items,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Erreur chargement commandes :",
          error
        );

        setLoading(false);
        return;
      }

      setOrders(data || []);
      setLoading(false);
    }

    loadOrders();
  }, []);

  function reorder(order) {
    if (
      !order ||
      !Array.isArray(order.items)
    ) {
      return;
    }

    const newCart = {};

    order.items.forEach((item) => {
      if (!item.id) {
        return;
      }

      newCart[String(item.id)] =
        Number(
          item.qty ||
            item.quantity ||
            1
        );
    });

    localStorage.setItem(
      "sofresh_cart",
      JSON.stringify(newCart)
    );

    const cartCount =
      Object.values(newCart).reduce(
        (total, quantity) =>
          total +
          Number(quantity || 0),
        0
      );

    window.dispatchEvent(
      new CustomEvent(
        "sofresh-cart-count",
        {
          detail: cartCount,
        }
      )
    );

    window.location.href =
      "/commander";
  }

  return (
    <main className="account-page orders-history-page">
      <div className="account-container orders-history-container">
        <Link
          href="/compte"
          className="account-back-link"
        >
          ← Retour à mon compte
        </Link>

        <h1>
          Mon historique de commandes
        </h1>

        <p className="account-intro">
          Retrouvez vos commandes passées
          et à venir.
        </p>

        {loading && (
          <p className="account-intro">
            Chargement de vos commandes...
          </p>
        )}

        {!loading &&
          orders.length === 0 && (
            <p className="account-intro">
              Vous n’avez pas encore de
              commande.
            </p>
          )}

        <div className="orders-history-list">
          {!loading &&
            orders.map((order) => (
              <div
                className="orders-history-card"
                key={order.id}
              >
                <div className="orders-history-main">
                  <div className="orders-history-info">
                    <div className="orders-history-number">
                      Commande{" "}
                      <span>
                        SF-
                        {
                          order.order_number
                        }
                      </span>
                    </div>

                    <div className="orders-history-date">
                      {formatPickupDate(
                        order.pickup_date
                      )}
                      {" · "}
                      {formatPickupTime(
                        order.pickup_time
                      )}
                    </div>
                  </div>

                  <div className="orders-history-price">
                    {euro(order.total)}
                  </div>
                </div>

                <div
                  className="orders-history-actions"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "8px",
                    marginTop: "13px",
                  }}
                >
                  <Link
                    href={`/compte/commandes/${order.id}`}
                    aria-label={`Voir la commande SF-${order.order_number}`}
                    style={{
                      minHeight: "44px",
                      padding: "8px 10px",
                      borderRadius: "11px",
                      background: "#5A7F0D",
                      color: "#ffffff",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: "700",
                      boxSizing: "border-box",
                    }}
                  >
                    <span>
                      Voir la commande
                    </span>

                    <ArrowIcon />
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      reorder(order)
                    }
                    aria-label={`Renouveler la commande SF-${order.order_number}`}
                    style={{
                      minHeight: "44px",
                      padding: "8px 10px",
                      borderRadius: "11px",
                      border:
                        "1.5px solid #5A7F0D",
                      background: "#ffffff",
                      color: "#5A7F0D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <RenewIcon />

                    <span>
                      Renouveler
                    </span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}