"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function parisToday() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    Number(
      parts.find((part) => part.type === type)?.value || 0
    );

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    12,
    0,
    0
  );
}

function dateToIso(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isoToDate(isoDate) {
  if (!isoDate) return null;

  const [year, month, day] = isoDate
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function formatDateLabel(isoDate) {
  const date = isoToDate(isoDate);

  if (!date) {
    return "Date non renseignée";
  }

  const today = parisToday();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateIso = dateToIso(date);
  const todayIso = dateToIso(today);
  const tomorrowIso = dateToIso(tomorrow);

  const formatted =
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);

  const prettyDate =
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1);

  if (dateIso === todayIso) {
    return `Aujourd’hui — ${prettyDate}`;
  }

  if (dateIso === tomorrowIso) {
    return `Demain — ${prettyDate}`;
  }

  return prettyDate;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [soundEnabled, setSoundEnabled] =
    useState(true);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("pickup_date", {
        ascending: true,
      })
      .order("pickup_time", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erreur de chargement :",
        error
      );

      setMessage(
        "Impossible de charger les commandes."
      );

      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  function playNewOrderSound() {
    const audio = new Audio("/ding.mp3");

    audio.volume = 1;

    audio.play().catch((error) => {
      console.error(
        "Le son n’a pas pu être joué :",
        error
      );
    });
  }

  function enableSound() {
    setSoundEnabled(true);
    playNewOrderSound();
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" &&
            soundEnabled
          ) {
            playNewOrderSound();
          }

          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  async function markAsFinished(orderId) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        status: "Terminée",
      })
      .eq("id", orderId);

    if (error) {
      console.error(
        "Erreur de mise à jour :",
        error
      );

      setMessage(
        "La commande n’a pas pu être marquée comme remise."
      );

      return;
    }

    setOrders((currentOrders) =>
      currentOrders.filter(
        (order) => order.id !== orderId
      )
    );
  }

  const waitingOrders = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.status !== "Terminée" &&
            order.status !== "Annulée"
        )
        .sort((a, b) => {
          const dateA = a.pickup_date || "";
          const dateB = b.pickup_date || "";

          if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
          }

          const timeA = a.pickup_time || "";
          const timeB = b.pickup_time || "";

          return timeA.localeCompare(timeB);
        }),
    [orders]
  );

  const groupedByDate = useMemo(() => {
    return waitingOrders.reduce(
      (groups, order) => {
        const date =
          order.pickup_date || "Sans date";

        if (!groups[date]) {
          groups[date] = [];
        }

        groups[date].push(order);

        return groups;
      },
      {}
    );
  }, [waitingOrders]);

  return (
    <main className="admin-wrap orders-mobile-page">
      <section className="admin-card">

        <div className="orders-mobile-header">
          <h1>Commandes</h1>

          <button
            type="button"
            className="secondary"
            onClick={enableSound}
          >
            {soundEnabled
              ? "🔔 Sonnerie activée"
              : "🔕 Activer la sonnerie"}
          </button>
        </div>

        <div
          style={{
            marginTop: "18px",
            marginBottom: "26px",
            background: "#F4F7E9",
            border: "1px solid #DCE7B8",
            borderRadius: "12px",
            padding: "14px 18px",
            fontWeight: "800",
            color: "#31410A",
            fontSize: "15px",
          }}
        >
          {waitingOrders.length === 0
            ? "✓ Aucune commande à traiter"
            : `${waitingOrders.length} commande${
                waitingOrders.length > 1 ? "s" : ""
              } à traiter`}
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {loading && (
          <p className="orders-loading">
            Chargement des commandes…
          </p>
        )}

        {!loading &&
          waitingOrders.length === 0 && (
            <div className="empty">
              Toutes les commandes sont traitées.
            </div>
          )}

        {!loading && (
          <div>
            {Object.entries(groupedByDate).map(
              ([pickupDate, dateOrders]) => (
                <section
                  key={pickupDate}
                  style={{
                    border: "1px solid #E2E2DA",
                    borderRadius: "14px",
                    overflow: "hidden",
                    marginBottom: "18px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      minHeight: "58px",
                      padding: "0 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      borderBottom:
                        "1px solid #ECECE5",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "17px",
                        color: "#1f2b16",
                      }}
                    >
                      📅{" "}
                      {pickupDate === "Sans date"
                        ? "Date non renseignée"
                        : formatDateLabel(
                            pickupDate
                          )}
                    </strong>

                    <span
                      style={{
                        color: "#5A7F0D",
                        fontWeight: "800",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dateOrders.length} commande
                      {dateOrders.length > 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  {dateOrders.map((order) => {
                    const items = Array.isArray(
                      order.items
                    )
                      ? order.items
                      : [];

                    const orderNumber =
                      order.order_number ||
                      String(order.id)
                        .slice(0, 6)
                        .toUpperCase();

                    return (
                      <article
                        key={order.id}
                        style={{
                          minHeight: "92px",
                          padding: "14px 18px",
                          display: "grid",
                          gridTemplateColumns:
                            "120px 160px 180px minmax(220px, 1fr) 90px 130px",
                          gap: "16px",
                          alignItems: "center",
                          borderBottom:
                            "1px solid #F0F0EB",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "18px",
                            color: "#1d2618",
                            whiteSpace: "nowrap",
                          }}
                        >
                          🕚{" "}
                          {order.pickup_time ||
                            "Sans heure"}
                        </div>

                        <div>
                          <strong
                            style={{
                              display: "block",
                              fontSize: "15px",
                              color: "#111111",
                              marginBottom: "4px",
                            }}
                          >
                            {order.customer_name ||
                              "Client"}
                          </strong>

                          <span
                            style={{
                              fontSize: "12px",
                              color: "#666666",
                            }}
                          >
                            SF-{orderNumber}
                          </span>
                        </div>

                        <div>
                          {order.customer_phone ? (
                            <a
                              href={`tel:${String(
                                order.customer_phone
                              ).replace(/\s/g, "")}`}
                              style={{
                                color: "#5A7F0D",
                                textDecoration: "none",
                                fontWeight: "700",
                                fontSize: "14px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              ☎ {order.customer_phone}
                            </a>
                          ) : (
                            <span
                              style={{
                                color: "#999999",
                                fontSize: "13px",
                              }}
                            >
                              Pas de téléphone
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            color: "#222222",
                            fontSize: "14px",
                            lineHeight: "1.5",
                          }}
                        >
                          {items.length === 0 ? (
                            <span>
                              Aucun produit renseigné
                            </span>
                          ) : (
                            items.map(
                              (item, index) => (
                                <div
                                  key={`${order.id}-${index}`}
                                >
                                  <b>{item.qty} ×</b>{" "}
                                  {item.name}
                                </div>
                              )
                            )
                          )}
                        </div>

                        <strong
                          style={{
                            fontSize: "15px",
                            color: "#111111",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {euro(order.total)}
                        </strong>

                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            markAsFinished(order.id)
                          }
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            borderRadius: "11px",
                            fontWeight: "800",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ✓ Remise
                        </button>
                      </article>
                    );
                  })}
                </section>
              )
            )}
          </div>
        )}

        {!loading && waitingOrders.length > 0 && (
          <div
            style={{
              marginTop: "26px",
              textAlign: "center",
              color: "#5e6658",
              fontSize: "13px",
            }}
          >
            🌱 Les commandes terminées disparaissent de cette liste.
          </div>
        )}
      </section>
    </main>
  );
}