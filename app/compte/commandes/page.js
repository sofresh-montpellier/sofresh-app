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

export default function CommandesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          pickup_date,
          pickup_time,
          total,
          status,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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

  return (
    <main className="account-page orders-history-page">
      <div className="account-container orders-history-container">

        <Link
          href="/compte"
          className="account-back-link"
        >
          ← Retour à mon compte
        </Link>

        <h1>Mon historique de commandes</h1>

        <p className="account-intro">
          Retrouvez vos commandes passées et à venir.
        </p>

        {loading && (
          <p className="account-intro">
            Chargement de vos commandes...
          </p>
        )}

        {!loading && orders.length === 0 && (
          <p className="account-intro">
            Vous n’avez pas encore de commande.
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
                        SF-{order.order_number}
                      </span>
                    </div>

                    <div className="orders-history-date">
                      {formatPickupDate(order.pickup_date)}
                      {" · "}
                      {formatPickupTime(order.pickup_time)}
                    </div>
                  </div>

                  <div className="orders-history-price">
                    {euro(order.total)}
                  </div>
                </div>

                <Link
                  href={`/compte/commandes/${order.id}`}
                  className="orders-history-link"
                >
                  Voir la commande
                  <span>›</span>
                </Link>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}