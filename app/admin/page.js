"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const COLUMNS = [
  { key: "Nouvelle", title: "Nouvelles", action: "Accepter", next: "En préparation" },
  { key: "Acceptée", title: "Acceptées", action: "Préparer", next: "En préparation" },
  { key: "En préparation", title: "En préparation", action: "Marquer prête", next: "Prête" },
  { key: "Prête", title: "Prêtes", action: "Terminer", next: "Terminée" },
];

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const previousIds = useRef(new Set());

  async function loadOrders({ playSound = false } = {}) {
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .neq("status", "Annulée")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setError("Impossible de charger les commandes.");
      setLoading(false);
      return;
    }

    const fresh = data || [];

    if (playSound && previousIds.current.size > 0) {
      const hasNewOrder = fresh.some(
        (order) => !previousIds.current.has(order.id) && order.status === "Nouvelle"
      );
      if (hasNewOrder) {
        try {
          const audio = new Audio(
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
          );
          await audio.play();
        } catch {
          // Certains navigateurs bloquent le son avant une première interaction.
        }
      }
    }

    previousIds.current = new Set(fresh.map((order) => order.id));
    setOrders(fresh);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders({ playSound: true })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function changeStatus(orderId, status) {
    setSavingId(orderId);
    setError("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setError("Le statut n'a pas pu être modifié.");
    } else {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    }

    setSavingId(null);
  }

  const todayRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "Annulée")
        .reduce((total, order) => total + Number(order.total), 0),
    [orders]
  );

  const visibleOrders = orders.filter((order) => order.status !== "Terminée");

  return (
    <>
      <header className="topbar kitchen-header">
        <div className="brand">
          SO <span>FRESH</span> — Cuisine
        </div>
        <div className="kitchen-summary">
          {visibleOrders.length} en cours · {euro(todayRevenue)}
        </div>
        <Link href="/">Boutique</Link>
      </header>

      <main className="kitchen-page">
        {error && <div className="message">{error}</div>}
        {loading && <p>Chargement des commandes…</p>}

        <div className="kitchen-board">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter(
              (order) => order.status === column.key
            );

            return (
              <section className={`kitchen-column status-${column.key}`} key={column.key}>
                <div className="kitchen-column-title">
                  <h2>{column.title}</h2>
                  <span>{columnOrders.length}</span>
                </div>

                <div className="kitchen-cards">
                  {columnOrders.length === 0 && (
                    <div className="kitchen-empty">Aucune commande</div>
                  )}

                  {columnOrders.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : [];

                    return (
                      <article className="kitchen-card" key={order.id}>
                        <div className="kitchen-card-top">
                          <strong>
                            #{String(order.id).slice(0, 8).toUpperCase()}
                          </strong>
                          <span className="kitchen-time">{order.pickup_time}</span>
                        </div>

                        <div className="kitchen-customer">
                          {order.customer_name}
                        </div>

                        <div className="kitchen-items">
                          {items.map((item, index) => (
                            <div key={`${order.id}-${index}`}>
                              <b>{item.qty}×</b> {item.name}
                            </div>
                          ))}
                        </div>

                        <div className="kitchen-card-bottom">
                          <strong>{euro(order.total)}</strong>
                          <button
                            className="primary"
                            disabled={savingId === order.id}
                            onClick={() => changeStatus(order.id, column.next)}
                          >
                            {savingId === order.id
                              ? "Enregistrement…"
                              : column.action}
                          </button>
                        </div>

                        <button
                          className="cancel-order"
                          disabled={savingId === order.id}
                          onClick={() => changeStatus(order.id, "Annulée")}
                        >
                          Annuler
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <section className="finished-section">
          <h2>Commandes terminées</h2>
          <div className="finished-orders">
            {orders
              .filter((order) => order.status === "Terminée")
              .slice(-10)
              .reverse()
              .map((order) => (
                <div className="finished-order" key={order.id}>
                  <span>{order.customer_name}</span>
                  <span>{order.pickup_time}</span>
                  <span>{euro(order.total)}</span>
                </div>
              ))}
          </div>
        </section>
      </main>
    </>
  );
}
