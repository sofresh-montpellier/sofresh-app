"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

  const get = (type) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    12,
    0,
    0
  );
}

function nextOpenDay() {
  const date = parisToday();

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function formatDate(date) {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(nextOpenDay());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showFinished, setShowFinished] = useState(false);
const audioRef = useRef(null);
const knownOrderIdsRef = useRef(new Set());
const firstLoadRef = useRef(true);
const [soundEnabled, setSoundEnabled] = useState(false);
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
      console.error("Erreur de chargement :", error);
      setMessage("Impossible de charger les commandes.");
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
    .channel(`orders-${selectedIso}`)
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
}, [selectedIso, soundEnabled]);

  function changeDay(delta) {
    const nextDate = new Date(selectedDate);

    do {
      nextDate.setDate(nextDate.getDate() + delta);
    } while (
      nextDate.getDay() === 0 ||
      nextDate.getDay() === 6
    );

    setSelectedDate(nextDate);
  }

  async function markAsFinished(orderId) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        status: "Terminée",
      })
      .eq("id", orderId);

    if (error) {
      console.error("Erreur de mise à jour :", error);
      setMessage(
        "La commande n’a pas pu être marquée comme remise."
      );
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "Terminée",
            }
          : order
      )
    );
  }

  const waitingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "Terminée" &&
          order.status !== "Annulée"
      ),
    [orders]
  );

  const finishedOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "Terminée"
      ),
    [orders]
  );

  const displayedOrders = showFinished
    ? finishedOrders
    : waitingOrders;

  const groupedOrders = useMemo(() => {
    return displayedOrders.reduce((groups, order) => {
      const time = order.pickup_time || "Sans heure";

      if (!groups[time]) {
        groups[time] = [];
      }

      groups[time].push(order);

      return groups;
    }, {});
  }, [displayedOrders]);

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

        <div className="orders-day-navigation">
          <button
            type="button"
            aria-label="Jour précédent"
            onClick={() => changeDay(-1)}
          >
            ‹
          </button>

          <strong>{formatDate(selectedDate)}</strong>

          <button
            type="button"
            aria-label="Jour suivant"
            onClick={() => changeDay(1)}
          >
            ›
          </button>
        </div>

        <div className="orders-tabs">
          <button
            type="button"
            className={!showFinished ? "active" : ""}
            onClick={() => setShowFinished(false)}
          >
            En attente ({waitingOrders.length})
          </button>

          <button
            type="button"
            className={showFinished ? "active" : ""}
            onClick={() => setShowFinished(true)}
          >
            Terminées ({finishedOrders.length})
          </button>
        </div>

        {message && (
          <div className="message">{message}</div>
        )}

        {loading && (
          <p className="orders-loading">
            Chargement des commandes…
          </p>
        )}

        {!loading && displayedOrders.length === 0 && (
          <div className="empty">
            {showFinished
              ? "Aucune commande terminée pour cette date."
              : "Aucune commande en attente pour cette date."}
          </div>
        )}

        <div className="orders-time-groups">
          {Object.entries(groupedOrders).map(
            ([time, timeOrders]) => (
              <section
                className="orders-time-group"
                key={time}
              >
                <div className="orders-time-title">
                  <strong>🕚 {time}</strong>

                  <span>
                    {timeOrders.length} commande
                    {timeOrders.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="orders-mobile-list">
                  {timeOrders.map((order) => {
                    const items = Array.isArray(order.items)
                      ? order.items
                      : [];

                    const orderNumber =
                      order.order_number ||
                      String(order.id)
                        .slice(0, 6)
                        .toUpperCase();

                    return (
                      <article
                        className="order-mobile-card"
                        key={order.id}
                      >
                        <div className="order-mobile-top">
                          <div>
                            <strong className="order-customer">
                              {order.customer_name || "Client"}
                            </strong>

                            <div className="order-number">
                              SF-{orderNumber}
                            </div>
                          </div>

                          <strong className="order-total">
                            {euro(order.total)}
                          </strong>
                        </div>

                        {order.customer_phone && (
                          <a
                            className="order-phone"
                            href={`tel:${String(
                              order.customer_phone
                            ).replace(/\s/g, "")}`}
                          >
                            ☎ {order.customer_phone}
                          </a>
                        )}

                        <div className="order-mobile-items">
                          {items.length === 0 && (
                            <div>
                              Aucun produit renseigné
                            </div>
                          )}

                          {items.map((item, index) => (
                            <div
                              key={`${order.id}-${index}`}
                            >
                              <b>{item.qty} ×</b>{" "}
                              {item.name}
                            </div>
                          ))}
                        </div>

                        {!showFinished && (
                          <button
                            type="button"
                            className="primary recovered-button"
                            onClick={() =>
                              markAsFinished(order.id)
                            }
                          >
                            ✓ Remise
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              
              </section>
            )
          )}
        </div>
      </section>
    </main>
    );
}
