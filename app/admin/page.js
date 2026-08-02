"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const isoTodayParis = () => {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showRecovered, setShowRecovered] = useState(false);

  const today = isoTodayParis();

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("pickup_date", today)
      .order("pickup_time", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Impossible de charger les commandes.");
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-mobile")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markRecovered(orderId) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "Terminée" })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setMessage("La commande n'a pas pu être marquée comme récupérée.");
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "Terminée" } : order
      )
    );
  }

  const displayedOrders = useMemo(
    () =>
      orders.filter((order) =>
        showRecovered
          ? order.status === "Terminée"
          : order.status !== "Terminée" && order.status !== "Annulée"
      ),
    [orders, showRecovered]
  );

  const groupedOrders = useMemo(() => {
    return displayedOrders.reduce((groups, order) => {
      const time = order.pickup_time || "Sans heure";
      if (!groups[time]) groups[time] = [];
      groups[time].push(order);
      return groups;
    }, {});
  }, [displayedOrders]);

  return (
    <main className="admin-wrap orders-mobile-page">
      <section className="admin-card">
        <div className="orders-mobile-header">
          <div>
            <h1>Commandes</h1>
            <p className="orders-date">{formatDate(today)}</p>
          </div>

          <button className="secondary" onClick={loadOrders}>
            Actualiser
          </button>
        </div>

        <div className="orders-tabs">
          <button
            className={!showRecovered ? "active" : ""}
            onClick={() => setShowRecovered(false)}
          >
            À récupérer
          </button>
          <button
            className={showRecovered ? "active" : ""}
            onClick={() => setShowRecovered(true)}
          >
            Récupérées
          </button>
        </div>

        {loading && <p>Chargement…</p>}
        {message && <div className="message">{message}</div>}

        {!loading && !displayedOrders.length && (
          <div className="empty">
            {showRecovered
              ? "Aucune commande récupérée aujourd'hui."
              : "Aucune commande à récupérer aujourd'hui."}
          </div>
        )}

        <div className="orders-time-groups">
          {Object.entries(groupedOrders).map(([time, timeOrders]) => (
            <section className="orders-time-group" key={time}>
              <div className="orders-time-title">
                <strong>{time}</strong>
                <span>{timeOrders.length} commande{timeOrders.length > 1 ? "s" : ""}</span>
              </div>

              <div className="orders-mobile-list">
                {timeOrders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];

                  return (
                    <article className="order-mobile-card" key={order.id}>
                      <div className="order-mobile-top">
                        <div>
                          <strong className="order-customer">
                            {order.customer_name}
                          </strong>
                          <div className="order-number">
                            SF-{order.order_number || String(order.id).slice(0, 6).toUpperCase()}
                          </div>
                        </div>

                        <strong>{euro(order.total)}</strong>
                      </div>

                      <a
                        className="order-phone"
                        href={`tel:${String(order.customer_phone).replace(/\s/g, "")}`}
                      >
                        {order.customer_phone}
                      </a>

                      <div className="order-mobile-items">
                        {items.map((item, index) => (
                          <div key={`${order.id}-${index}`}>
                            <b>{item.qty} ×</b> {item.name}
                          </div>
                        ))}
                      </div>

                      {!showRecovered && (
                        <button
                          className="primary recovered-button"
                          onClick={() => markRecovered(order.id)}
                        >
                          Récupérée
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
