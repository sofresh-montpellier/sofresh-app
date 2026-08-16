"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../../lib/supabase";

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

export default function CommandeDetailPage() {
  const params = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
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
          items,
          created_at
        `)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(
          "Erreur chargement détail commande :",
          error
        );

        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    }

    loadOrder();
  }, [params.id]);
  function reorder() {
  if (!order || !Array.isArray(order.items)) return;

  const newCart = {};

  order.items.forEach((item) => {
    if (!item.id) return;

   newCart[String(item.id)] =
  Number(item.qty || item.quantity || 1);
  });

  localStorage.setItem(
    "sofresh_cart",
    JSON.stringify(newCart)
  );

  window.location.href = "/commander";
}

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-container">
          <p className="account-intro">
            Chargement de la commande...
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="account-page">
        <div className="account-container">
          <h1>Commande introuvable</h1>

          <Link
            href="/compte/commandes"
            className="account-back-link"
          >
            ← Retour à mes commandes
          </Link>
        </div>
      </main>
    );
  }

  const items = Array.isArray(order.items)
    ? order.items
    : [];

  return (
   <main className="account-page order-detail-page">
      <div className="account-container order-detail-container">

        <Link
          href="/compte/commandes"
          className="account-back-link"
        >
          ← Retour à mes commandes
        </Link>

      <h1>Mon historique de commandes</h1>
        <p
  style={{
    margin: "4px 0 6px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#5A7F0D",
  }}
>
  Commande SF-{order.order_number}
</p>

        <p className="account-intro">
          Retrait{" "}
          {formatPickupDate(order.pickup_date)}
          {" · "}
          {formatPickupTime(order.pickup_time)}
        </p>

        <div className="account-orders">
          {items.map((item, index) => (
            <div
            className="order-detail-item"
              key={index}
            >
              <div className="account-order-top">
  <span className="account-order-title">
    {item.name || "Produit"}
  </span>

  <span className="account-order-total">
    {euro(
      Number(item.unit_price || 0) *
        Number(item.qty || item.quantity || 1)
    )}
  </span>
</div>

<div className="account-order-label">
  {item.qty || item.quantity || 1} ×{" "}
  {euro(item.unit_price || 0)}
</div>
            </div>
          ))}
        </div>

        <div
          className="account-order-bottom"
          style={{
            marginTop: "18px",
            padding: "16px",
          }}
        >
          <span className="account-order-total-label">
            Total
          </span>

          <span className="account-order-total">
            {euro(order.total)}
          </span>
        </div>
        <button
  type="button"
  onClick={reorder}
  className="order-reorder-btn"
>
  Renouveler cette commande

  <svg
    width="22"
    height="22"
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
</button>
      </div>
    </main>
  );
}