"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function dateToIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parisToday() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return new Date(get("year"), get("month") - 1, get("day"), 12, 0, 0);
}

function nextOpenDay() {
  const date = parisToday();

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(nextOpenDay());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showRecovered, setShowRecovered] = useState(false);

  const selectedIso = dateToIso(selectedDate);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("pickup_date", selectedIso)
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
      .channel(`orders-${selectedIso}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedIso]);

  function changeDay(delta) {
    const next = new Date(selectedDate);

    do {
      next.setDate(next.getDate() + delta);
    } while (next.getDay() === 0 || next.getDay() === 6);

    setSelectedDate(next);
  }

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

  const groupedOrders = useMemo(
    () =>
      displayedOrders.reduce((groups, order) => {
        const time = order.pickup_time || "Sans heure";
        if (!groups[time]) groups[time] = [];
        groups[time].push(order);
        return groups;
      }, {}),
    [displayedOrders]
  );

  return (
    <main className="admin-wrap orders-mobile-page">
      <section className="admin-card">
        <div className="orders-mobile-header">
          <div>
            <h1>Commandes</h1>
            <p className="orders-date">{formatDate(selectedDate)}</p>
            <p className="orders-count">
              {orders.length === 0
                ? "Aucune commande prévue"
                : `${orders.length} commande${orders.length > 1 ? "s" : ""} prévue${orders.length > 1 ? "s" : ""}`}
            </p>
          </div>

          <button className="secondary" onClick={loadOrders}>
            Actualiser
          </button>
        </div>

        <div className="orders-day-navigation">
          <button onClick={() => changeDay(-1)}>Jour précédent</button>
          <button onClick={() => changeDay(1)}>Jour suivant</button>
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
              ? "Aucune commande récupérée pour cette date."
              : "Aucune commande à récupérer pour cette date."}
          </div>
        )}

        <div className="orders-time-groups">
          {Object.entries(groupedOrders).map(([time, timeOrders]) => (
            <section className="orders-time-group" key={time}>
              <div className="orders-time-title">
                <strong>{time}</strong>
                <span>
                  {timeOrders.length} commande{timeOrders.length > 1 ? "s" : ""}
                </span>
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
