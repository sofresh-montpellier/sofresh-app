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

function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");


  const [pushStatus, setPushStatus] =
    useState("idle");

  const [pushMessage, setPushMessage] =
    useState("");


  async function getAdminAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Votre session administrateur a expiré. Reconnectez-vous."
      );
    }

    return session.access_token;
  }

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
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    async function checkPushStatus() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setPushStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setPushStatus("denied");
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.getRegistration(
            "/"
          );

        if (!registration) {
          setPushStatus("idle");
          return;
        }

        const subscription =
          await registration.pushManager.getSubscription();

        if (subscription) {
          setPushStatus("enabled");
        } else {
          setPushStatus("idle");
        }
      } catch (error) {
        console.error(
          "Erreur vérification notifications :",
          error
        );
      }
    }

    checkPushStatus();
  }, []);

  async function enablePushNotifications() {
    setPushMessage("");

    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushStatus("unsupported");

      setPushMessage(
        "Les notifications ne sont pas disponibles sur cet appareil."
      );

      return;
    }

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      setPushMessage(
        "La clé publique des notifications est manquante."
      );

      return;
    }

    try {
      setPushStatus("loading");

      const accessToken =
        await getAdminAccessToken();

      const permission =
        await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus("denied");

        setPushMessage(
          "Les notifications n’ont pas été autorisées sur cet appareil."
        );

        return;
      }

      const registration =
        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
          }
        );

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          });
      }

      const response = await fetch(
        "/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(
            subscription.toJSON()
          ),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Impossible d’enregistrer les notifications."
        );
      }

      setPushStatus("enabled");

      setPushMessage(
        "Notifications téléphone activées sur cet appareil."
      );
    } catch (error) {
      console.error(
        "Erreur activation notifications :",
        error
      );

      setPushStatus("error");

      setPushMessage(
        error?.message ||
          "Impossible d’activer les notifications."
      );
    }
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            {pushStatus === "enabled" ? (
              <div
                className="push-active-badge"
                title="Les notifications sont activées sur cet appareil"
              >
                🔔 Notifications actives
              </div>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={enablePushNotifications}
                disabled={pushStatus === "loading"}
              >
                {pushStatus === "loading"
                  ? "Activation..."
                  : "📱 Activer les notifications"}
              </button>
            )}
          </div>
        </div>

        {pushMessage && (
          <div
            style={{
              marginTop: "14px",
              background: "#F4F7E9",
              border: "1px solid #DCE7B8",
              borderRadius: "10px",
              padding: "11px 14px",
              color: "#31410A",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {pushMessage}
          </div>
        )}

        {pushStatus === "denied" && (
          <div
            style={{
              marginTop: "14px",
              background: "#FFF2F2",
              border: "1px solid #EECACA",
              borderRadius: "10px",
              padding: "11px 14px",
              color: "#8A2D2D",
              fontSize: "13px",
            }}
          >
            Les notifications sont bloquées dans les
            réglages de votre navigateur.
          </div>
        )}

        {pushStatus === "unsupported" && (
          <div
            style={{
              marginTop: "14px",
              background: "#FFF8E8",
              border: "1px solid #F1D89A",
              borderRadius: "10px",
              padding: "11px 14px",
              color: "#684F0C",
              fontSize: "13px",
            }}
          >
            Cet appareil ou ce navigateur ne prend pas en
            charge les notifications push.
          </div>
        )}

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
              ([pickupDate, dateOrders], dayIndex) => (
                <section
                  className="order-day-card"
                  data-day-color={dayIndex % 4}
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
                    className="order-day-header"
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
                        className="order-row"
                        data-day-color={dayIndex % 4}
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
                          className="order-time"
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

                        <div className="order-customer">
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

                        <div className="order-phone">
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
                          className="order-items"
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
                              (item, index) => {
                                const selections =
                                  Array.isArray(
                                    item.formula_selections
                                  )
                                    ? item.formula_selections
                                    : Array.isArray(
                                        item.selections
                                      )
                                    ? item.selections
                                    : [];

                                return (
                                  <div
                                    key={`${order.id}-${index}`}
                                    className="order-item"
                                  >
                                    <div>
                                      <b>{item.qty} ×</b>{" "}
                                      {item.name}
                                    </div>

                                    {selections.length > 0 && (
                                      <div className="formula-details">
                                        {selections.map(
                                          (
                                            selection,
                                            selectionIndex
                                          ) => {
                                            const stepName =
                                              selection.step_name ||
                                              selection.stepName ||
                                              "";

                                            const productName =
                                              selection.product_name ||
                                              selection.productName ||
                                              selection.name ||
                                              "";

                                            if (
                                              !stepName &&
                                              !productName
                                            ) {
                                              return null;
                                            }

                                            return (
                                              <div
                                                key={`${order.id}-${index}-${selectionIndex}`}
                                              >
                                                {stepName && (
                                                  <strong>
                                                    {stepName} :{" "}
                                                  </strong>
                                                )}
                                                {productName}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )
                          )}
                        </div>

                        <strong
                          className="order-total"
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
                          className="primary order-finish"
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

        {!loading &&
          waitingOrders.length > 0 && (
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

      <style jsx>{`
        .formula-details {
          margin-top: 4px;
          padding-left: 18px;
          color: #62685d;
          font-size: 12px;
          line-height: 1.4;
        }

        .formula-details strong {
          color: #5a7f0d;
        }

        .order-item + .order-item {
          margin-top: 3px;
        }

        .push-active-badge {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 7px 11px;
          border: 1px solid #b7cf63;
          border-radius: 10px;
          background: #f4f7e9;
          color: #31410a;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        @media (max-width: 700px) {
          .admin-wrap.orders-mobile-page {
            padding: 12px 10px 28px !important;
            overflow-x: hidden;
          }

          .orders-mobile-page .admin-card {
            padding: 12px 10px !important;
            border-radius: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .orders-mobile-header {
            align-items: flex-start !important;
            gap: 10px !important;
          }

          .orders-mobile-header h1 {
            font-size: 23px !important;
            margin: 0 !important;
          }

          .orders-mobile-header > div {
            gap: 6px !important;
            justify-content: flex-end !important;
          }

          .orders-mobile-header .secondary {
            min-height: 38px !important;
            padding: 7px 10px !important;
            border-radius: 10px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            max-width: 180px !important;
          }

          .push-active-badge {
            min-height: 34px !important;
            padding: 6px 9px !important;
            font-size: 10px !important;
            border-radius: 9px !important;
          }

          .order-day-card {
            border-radius: 12px !important;
            margin-bottom: 14px !important;
            overflow: hidden !important;
          }

          .order-day-card[data-day-color="0"] .order-day-header {
            background: #e9f5df !important;
            border-bottom-color: #d7e9c8 !important;
          }

          .order-day-card[data-day-color="1"] .order-day-header {
            background: #fff1c7 !important;
            border-bottom-color: #f2dda0 !important;
          }

          .order-day-card[data-day-color="2"] .order-day-header {
            background: #e4f1ff !important;
            border-bottom-color: #cfe3f8 !important;
          }

          .order-day-card[data-day-color="3"] .order-day-header {
            background: #f2e9ff !important;
            border-bottom-color: #e1d2f5 !important;
          }

          .order-row {
            position: relative !important;
          }

          .order-row::before {
            content: "";
            position: absolute;
            left: 0;
            top: 9px;
            bottom: 9px;
            width: 5px;
            border-radius: 0 5px 5px 0;
          }

          .order-row[data-day-color="0"]::before {
            background: #78ad2f;
          }

          .order-row[data-day-color="1"]::before {
            background: #f0b90b;
          }

          .order-row[data-day-color="2"]::before {
            background: #3b8eea;
          }

          .order-row[data-day-color="3"]::before {
            background: #9a6bc4;
          }

          .order-day-header {
            min-height: 0 !important;
            padding: 11px 12px !important;
            gap: 8px !important;
            align-items: flex-start !important;
          }

          .order-day-header strong {
            font-size: 14px !important;
            line-height: 1.25 !important;
          }

          .order-day-header span {
            font-size: 11px !important;
          }

          .order-row {
            min-height: 0 !important;
            padding: 13px 12px !important;
            display: grid !important;
            grid-template-columns: 82px minmax(0, 1fr) !important;
            gap: 7px 10px !important;
            align-items: start !important;
          }

          .order-time {
            grid-column: 1 !important;
            grid-row: 1 !important;
            font-size: 16px !important;
          }

          .order-customer {
            grid-column: 2 !important;
            grid-row: 1 !important;
            min-width: 0 !important;
          }

          .order-customer strong {
            font-size: 14px !important;
            margin-bottom: 2px !important;
          }

          .order-phone {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;
            padding-left: 92px !important;
            min-width: 0 !important;
          }

          .order-phone a {
            font-size: 12px !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
          }

          .order-items {
            grid-column: 1 / -1 !important;
            grid-row: 3 !important;
            margin-top: 4px !important;
            padding: 9px 10px !important;
            background: #f8faef !important;
            border-radius: 9px !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            min-width: 0 !important;
          }

          .formula-details {
            padding-left: 14px !important;
            font-size: 11px !important;
          }

          .order-total {
            grid-column: 1 !important;
            grid-row: 4 !important;
            align-self: center !important;
            text-align: left !important;
            font-size: 15px !important;
          }

          .order-finish {
            grid-column: 2 !important;
            grid-row: 4 !important;
            justify-self: end !important;
            width: auto !important;
            min-width: 112px !important;
            min-height: 40px !important;
            padding: 8px 14px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </main>
  );
}