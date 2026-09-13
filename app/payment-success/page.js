"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";

/* =========================
   FORMAT PRIX
========================= */

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

/* =========================
   ICÔNES MODERNES
========================= */

function CheckIcon() {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.6 2.6L16.5 9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
      <path d="M8 17h.01M12 17h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 16h16" />
      <path d="M6 16a6 6 0 0 1 12 0" />
      <path d="M12 7V5" />
      <path d="M3 19h18" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
      />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

const BASIL_IMAGE = "/basil-commander.png";

function BasilDecoration() {
  return (
    <img
      className="payment-success-basil"
      src={BASIL_IMAGE}
      alt=""
      aria-hidden="true"
    />
  );
}

function ArrowIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* =========================
   FORMAT DATE
========================= */

function formatPickupDate(value) {
  if (!value) return "";

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  const formatted =
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
}

function formatPickupTime(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s*[Hh:]\s*/, " h ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   PAGE
========================= */

export default function PaymentSuccessPage() {
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfirmation() {
      const savedDate =
        localStorage.getItem("sofresh_pickup_date") || "";

      const savedTime =
        localStorage.getItem("sofresh_pickup_time") || "";

      if (!cancelled) {
        setPickupDate(savedDate);
        setPickupTime(savedTime);
      }

      const sessionId = new URLSearchParams(
        window.location.search
      ).get("session_id");

      let orderLoadedFromSupabase = false;

      /* =========================================
         1. PRIORITÉ : LA VRAIE COMMANDE SUPABASE
         =========================================

         La page de confirmation ne dépend plus du panier local.
         On recharge la commande enregistrée grâce au session_id Stripe.
         Le webhook peut avoir un léger délai : on retente quelques fois.
      */

      if (isSupabaseConfigured && supabase) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            for (let attempt = 0; attempt < 10; attempt += 1) {
              let order = null;

              if (sessionId) {
                const { data: exactOrder, error: exactError } =
                  await supabase
                    .from("orders")
                    .select(`
                      id,
                      order_number,
                      pickup_date,
                      pickup_time,
                      total,
                      items,
                      payment_status,
                      stripe_session_id,
                      created_at
                    `)
                    .eq("user_id", user.id)
                    .eq("stripe_session_id", sessionId)
                    .maybeSingle();

                if (exactError) {
                  console.error(
                    "Erreur chargement commande Stripe :",
                    exactError
                  );
                }

                order = exactOrder || null;
              }

              /*
               * Sécurité de secours si la colonne session n'est pas encore
               * renseignée au moment précis du retour Stripe.
               */
              if (!order) {
                let fallbackQuery = supabase
                  .from("orders")
                  .select(`
                    id,
                    order_number,
                    pickup_date,
                    pickup_time,
                    total,
                    items,
                    payment_status,
                    stripe_session_id,
                    created_at
                  `)
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false })
                  .limit(1);

                /*
                 * Ne pas filtrer le secours par date/heure : le format
                 * local (ex. « 11 h 50 ») peut différer du format stocké
                 * dans Supabase. On prend simplement la dernière commande
                 * du client connecté.
                 */

                const {
                  data: fallbackOrder,
                  error: fallbackError,
                } = await fallbackQuery.maybeSingle();

                if (fallbackError) {
                  console.error(
                    "Erreur chargement commande de secours :",
                    fallbackError
                  );
                }

                order = fallbackOrder || null;
              }

              if (order) {
                let rawItems = order.items;

                if (typeof rawItems === "string") {
                  try {
                    rawItems = JSON.parse(rawItems);
                  } catch (error) {
                    console.error(
                      "Erreur lecture des articles de la commande :",
                      error
                    );
                    rawItems = [];
                  }
                }

                const normalizedItems = Array.isArray(rawItems)
                  ? rawItems.map((item, index) => {
                      const selections = Array.isArray(
                        item?.formula_selections
                      )
                        ? item.formula_selections
                        : Array.isArray(item?.selections)
                        ? item.selections
                        : [];

                      return {
                        id:
                          item?.id ||
                          `order-item-${index}`,
                        name:
                          item?.formula_name ||
                          item?.name ||
                          "Produit",
                        price: Number(
                          item?.unit_price ||
                            item?.price ||
                            0
                        ),
                        quantity: Number(
                          item?.qty ||
                            item?.quantity ||
                            1
                        ),
                        formula:
                          item?.formula === true ||
                          selections.length > 0,
                        selections,
                      };
                    })
                  : [];

                if (!cancelled) {
                  setOrderId(order.id || "");
                  setOrderNumber(order.order_number || "");
                  setPickupDate(
                    order.pickup_date || savedDate
                  );
                  setPickupTime(
                    order.pickup_time || savedTime
                  );
                  setOrderItems(normalizedItems);
                  setOrderTotal(
                    Number(order.total || 0)
                  );
                }

                orderLoadedFromSupabase = true;
                break;
              }

              if (attempt < 9) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 700)
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "Erreur chargement confirmation Supabase :",
            error
          );
        }
      }

      /* =========================================
         2. SECOURS : PANIER LOCAL
         =========================================

         Utile uniquement si le webhook Stripe n'a pas encore créé la
         commande. Dans le fonctionnement normal, Supabase est la source.
      */

      if (!orderLoadedFromSupabase) {
        let savedCart = {};

        try {
          savedCart = JSON.parse(
            localStorage.getItem("sofresh_cart") || "{}"
          );
        } catch (error) {
          console.error("Erreur lecture panier :", error);
          savedCart = {};
        }

        const cartEntries = Object.entries(savedCart).filter(
          ([, entry]) => {
            if (
              typeof entry === "object" &&
              entry?.type === "formula"
            ) {
              return Number(entry.qty || 0) > 0;
            }

            return Number(entry) > 0;
          }
        );

        if (cartEntries.length > 0) {
          const classicEntries = cartEntries.filter(
            ([, entry]) =>
              !(
                typeof entry === "object" &&
                entry?.type === "formula"
              )
          );

          let classicProducts = [];

          if (
            classicEntries.length > 0 &&
            isSupabaseConfigured &&
            supabase
          ) {
            const productIds = classicEntries.map(
              ([id]) => id
            );

            const { data, error } = await supabase
              .from("products")
              .select("id, name, price")
              .in("id", productIds);

            if (error) {
              console.error(
                "Erreur chargement récapitulatif :",
                error
              );
            } else {
              classicProducts = data || [];
            }
          }

          const items = cartEntries
            .map(([id, entry]) => {
              if (
                typeof entry === "object" &&
                entry?.type === "formula"
              ) {
                return {
                  id: entry.formula_product_id || id,
                  name: entry.name || "Formule",
                  price: Number(entry.price || 0),
                  quantity: Number(entry.qty || 1),
                  formula: true,
                  selections: Array.isArray(
                    entry.selections
                  )
                    ? entry.selections
                    : [],
                };
              }

              const product = classicProducts.find(
                (currentProduct) =>
                  String(currentProduct.id) === String(id)
              );

              if (!product) return null;

              return {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                quantity: Number(entry),
                formula: false,
                selections: [],
              };
            })
            .filter(Boolean);

          if (!cancelled) {
            setOrderItems(items);
            setOrderTotal(
              items.reduce(
                (sum, item) =>
                  sum + item.price * item.quantity,
                0
              )
            );
          }
        }
      }

      /*
       * Le panier n'est vidé qu'après avoir essayé de charger la vraie
       * commande et préparé le récapitulatif de secours.
       */
      localStorage.removeItem("sofresh_cart");

      window.dispatchEvent(
        new CustomEvent("sofresh-cart-count", {
          detail: 0,
        })
      );
    }

    loadConfirmation();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <main
        className="payment-success-page"
        style={{
          minHeight: "100dvh",
          padding:
            "calc(28px + env(safe-area-inset-top)) 16px calc(132px + env(safe-area-inset-bottom))",
          background: "#FFFFFF",
        }}
      >
        <div
          className="payment-success-card"
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            background: "transparent",
            borderRadius: "0",
            padding: "28px 28px 30px",
            boxShadow: "none",
            border: "none",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <BasilDecoration />


          {/* CHECK */}

          <div
            className="payment-success-check"
            style={{
              width: "100px",
              height: "100px",
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: "#F2F6DD",
              color: "#5A7F0D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon />
          </div>

          <h1
            className="payment-success-title"
            style={{
              margin: "0",
              color: "#17351E",
              fontSize: "38px",
              lineHeight: 1.1,
              fontWeight: "900",
            }}
          >
            Commande confirmée
          </h1>

          <div
            className="payment-success-yellow-line"
            style={{
              width: "110px",
              height: "4px",
              borderRadius: "99px",
              margin: "15px auto 20px",
              background: "#F2C94C",
            }}
          />

          <p
            className="payment-success-intro"
            style={{
              margin: 0,
              color: "#62675E",
              fontSize: "17px",
            }}
          >
            Votre commande a bien été enregistrée.
          </p>

          {orderNumber && (
            <div
              className="payment-success-order-number"
              style={{
                width: "fit-content",
                margin: "14px auto 0",
                padding: "7px 18px",
                borderRadius: "999px",
                background: "#F2F6DD",
                color: "#17351E",
                fontSize: "14px",
                fontWeight: "800",
              }}
            >
              Commande n° SF-{orderNumber}
            </div>
          )}

          {/* RETRAIT */}

          {(pickupDate ||
            pickupTime) && (
            <div
              className="payment-success-pickup"
              style={{
                marginTop: "24px",
                padding:
                  "27px 24px 30px",
                border:
                  "1px solid #CFE09C",
                borderRadius: "21px",
                background:
                  "linear-gradient(180deg,#FCFDF7 0%,#F6F9EC 100%)",
              }}
            >
              <div
                className="payment-success-pickup-title"
                style={{
                  color: "#5A7F0D",
                  fontSize: "18px",
                  fontWeight: "900",
                  letterSpacing: ".5px",
                  marginBottom: "20px",
                }}
              >
                VOTRE RETRAIT
              </div>

              <div
                className="payment-success-pickup-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1px 1fr",
                  gap: "22px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    className="payment-success-icon-box"
                    style={{
                      width: "62px",
                      height: "62px",
                      margin:
                        "0 auto 12px",
                      borderRadius:
                        "17px",
                      background:
                        "#ffffff",
                      color: "#5A7F0D",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      boxShadow:
                        "0 6px 18px rgba(40,70,20,.08)",
                    }}
                  >
                    <CalendarIcon />
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#696E64",
                      fontWeight:
                        "900",
                      marginBottom:
                        "7px",
                    }}
                  >
                    DATE
                  </div>

                  <strong
                    className="payment-success-date"
                    style={{
                      color:
                        "#17351E",
                      fontSize:
                        "22px",
                      lineHeight:
                        1.25,
                      display:
                        "block",
                    }}
                  >
                    {pickupDate
                      ? formatPickupDate(
                          pickupDate
                        )
                      : "—"}
                  </strong>
                </div>

                <div
                  className="payment-success-separator"
                  style={{
                    width: "1px",
                    height:
                      "125px",
                    background:
                      "#DCE6BF",
                  }}
                />

                <div>
                  <div
                    className="payment-success-icon-box"
                    style={{
                      width: "62px",
                      height: "62px",
                      margin:
                        "0 auto 12px",
                      borderRadius:
                        "17px",
                      background:
                        "#ffffff",
                      color: "#5A7F0D",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      boxShadow:
                        "0 6px 18px rgba(40,70,20,.08)",
                    }}
                  >
                    <ClockIcon />
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#696E64",
                      fontWeight:
                        "900",
                      marginBottom:
                        "7px",
                    }}
                  >
                    HEURE
                  </div>

                  <strong
                    className="payment-success-time"
                    style={{
                      color:
                        "#17351E",
                      fontSize:
                        "26px",
                      lineHeight:
                        1.2,
                      display:
                        "block",
                    }}
                  >
                    {pickupTime
                      ? formatPickupTime(pickupTime)
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* RÉCAPITULATIF COMMANDE */}

          {orderItems.length > 0 && (
            <div
              className="payment-success-order-summary"
              style={{
                marginTop: "16px",
                padding:
                  "20px 18px 17px",
                borderRadius: "18px",
                background: "#ffffff",
                border:
                  "1px solid #E5EAD7",
                textAlign: "left",
              }}
            >
              <div
                className="payment-success-order-title"
                style={{
                  color: "#5A7F0D",
                  fontSize: "15px",
                  fontWeight: "900",
                  letterSpacing:
                    ".5px",
                  marginBottom:
                    "13px",
                }}
              >
                VOTRE COMMANDE
              </div>

              {orderItems.map(
                (item) => (
                  <div
                    key={item.id}
                    className="payment-success-order-row"
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "14px",
                      padding:
                        "9px 0",
                      borderBottom:
                        "1px solid #F0F1EA",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color:
                              "#17351E",
                            fontSize:
                              "14px",
                          }}
                        >
                          {item.name}
                        </strong>

                        <span
                          style={{
                            marginLeft:
                              "7px",
                            color:
                              "#747A70",
                            fontSize:
                              "13px",
                          }}
                        >
                          ×{" "}
                          {
                            item.quantity
                          }
                        </span>
                      </div>

                      {item.formula &&
                        item.selections
                          ?.length > 0 && (
                          <div
                            style={{
                              marginTop:
                                "5px",
                              display:
                                "grid",
                              gap: "2px",
                            }}
                          >
                            {item.selections.map(
                              (
                                selection,
                                index
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
                                    key={`${item.id}-${index}`}
                                    style={{
                                      color:
                                        "#666B62",
                                      fontSize:
                                        "12px",
                                      lineHeight:
                                        1.35,
                                    }}
                                  >
                                    {stepName ? (
                                      <strong
                                        style={{
                                          color:
                                            "#5A7F0D",
                                        }}
                                      >
                                        {
                                          stepName
                                        }
                                        {" : "}
                                      </strong>
                                    ) : null}

                                    {
                                      productName
                                    }
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                    </div>

                    <strong
                      style={{
                        color:
                          "#5A7F0D",
                        fontSize:
                          "14px",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {euro(
                        item.price *
                          item.quantity
                      )}
                    </strong>
                  </div>
                )
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  paddingTop:
                    "14px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#17351E",
                    fontSize:
                      "15px",
                  }}
                >
                  Total
                </strong>

                <strong
                  style={{
                    color:
                      "#5A7F0D",
                    fontSize:
                      "19px",
                  }}
                >
                  {euro(
                    orderTotal
                  )}
                </strong>
              </div>
            </div>
          )}
                    {/* PREPARATION */}

          <div
            className="payment-success-preparation"
            style={{
              margin: "22px auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "14px",
              color: "#5C6258",
              fontSize: "16px",
              lineHeight: 1.45,
            }}
          >
            <div
              className="payment-success-service-icon"
              style={{
                flex: "0 0 48px",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#F2F6DD",
                color: "#5A7F0D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ServiceIcon />
            </div>

            <span
              style={{
                textAlign: "left",
              }}
            >
              Votre commande sera préparée
              <br />
              pour ce créneau de retrait.
            </span>
          </div>

          <div
            className="payment-success-divider"
            style={{
              height: "0",
              background: "transparent",
              marginBottom: "8px",
            }}
          />

          {/* BOUTONS */}

          <div
            className="payment-success-actions"
            style={{
              display: "grid",
              gap: "13px",
            }}
          >
            <Link
              href={
                orderId
                  ? `/compte/commandes/${orderId}`
                  : "/compte/commandes"
              }
              className="payment-success-orders-btn"
              style={{
                minHeight: "60px",
                padding: "0 20px",
                borderRadius: "15px",
                background:
                  "linear-gradient(180deg,#98BD12 0%,#7FA600 100%)",
                color: "#ffffff",
                textDecoration: "none",
                display: "grid",
                gridTemplateColumns:
                  "35px 1fr 35px",
                alignItems: "center",
                fontSize: "18px",
                fontWeight: "900",
                boxShadow:
                  "0 8px 18px rgba(127,166,0,.18)",
              }}
            >
              <OrderIcon />

              <span>
                Voir ma commande
              </span>

              <ArrowIcon />
            </Link>

            <Link
              href="/accueil-v2"
              className="payment-success-home-btn"
              style={{
                minHeight: "60px",
                padding: "0 20px",
                borderRadius: "15px",
                border:
                  "2px solid #98BD12",
                background: "#ffffff",
                color: "#5A7F0D",
                textDecoration: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "13px",
                fontSize: "18px",
                fontWeight: "900",
              }}
            >
              <HomeIcon />

              Retour à l’accueil
            </Link>
          </div>

          {/* SIGNATURE */}

          <div
            className="payment-success-signature"
            style={{
              marginTop: "25px",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: "11px",
            }}
          >
            <div
              style={{
                color: "#F2C94C",
                marginTop: "2px",
              }}
            >
              <HeartIcon />
            </div>

            <div
              style={{
                textAlign: "left",
                color: "#666B62",
                fontSize: "15px",
              }}
            >
              <div>
                Merci de votre confiance,
              </div>

              <div
                className="payment-success-team"
                style={{
                  marginTop: "3px",
                  color: "#5A7F0D",
                  fontSize: "21px",
                  fontWeight: "700",
                  fontStyle: "italic",
                }}
              >
                L’équipe So Fresh
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        
        .payment-success-basil {
          position: absolute;
          top: -6px;
          right: -16px;
          width: 148px;
          height: auto;
          object-fit: contain;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }



        .payment-success-card > *:not(.payment-success-basil) {
          position: relative;
          z-index: 1;
        }

        .payment-success-time {
          text-transform: none !important;
        }

        @media (max-width: 640px) {
          .payment-success-page {
            /*
             * La navigation de l'application est fixe.
             * On réserve sa hauteur + une vraie zone de respiration pour que
             * les derniers boutons puissent défiler entièrement AU-DESSUS.
             * Ne pas réduire les cartes/boutons pour les faire rentrer à l'écran.
             */
            --sofresh-bottom-nav-height: 64px;
            --sofresh-bottom-nav-gap: 34px;
            min-height: 100dvh !important;
            box-sizing: border-box !important;
            padding:
              calc(12px + env(safe-area-inset-top))
              0
              calc(
                var(--sofresh-bottom-nav-height) +
                var(--sofresh-bottom-nav-gap) +
                env(safe-area-inset-bottom)
              )
              !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .payment-success-card {
            max-width: 430px !important;
            border-radius: 0 !important;
            padding: 20px 24px 26px !important;
            background: #ffffff !important;
          }

          .payment-success-basil {
            top: -4px !important;
            right: -14px !important;
            width: 118px !important;
            height: auto !important;
          }


          .payment-success-check {
            width: 76px !important;
            height: 76px !important;
            margin-bottom: 18px !important;
          }

          .payment-success-check svg {
            width: 42px !important;
            height: 42px !important;
          }

          .payment-success-title {
            margin-top: 0 !important;
            font-size: 31px !important;
            line-height: 1.08 !important;
            letter-spacing: -0.6px !important;
          }

          .payment-success-yellow-line {
            width: 82px !important;
            height: 3px !important;
            margin: 12px auto 16px !important;
          }

          .payment-success-intro {
            font-size: 16px !important;
          }

          .payment-success-order-number {
            margin-top: 10px !important;
            padding: 6px 14px !important;
            font-size: 13px !important;
          }

          .payment-success-pickup {
            margin-top: 20px !important;
            padding: 18px 18px 20px !important;
            border-radius: 18px !important;
          }

          .payment-success-pickup-title {
            font-size: 16px !important;
            margin-bottom: 14px !important;
          }

          .payment-success-pickup-grid {
            gap: 12px !important;
          }

          .payment-success-icon-box {
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 8px !important;
            border-radius: 14px !important;
          }

          .payment-success-icon-box svg {
            width: 25px !important;
            height: 25px !important;
          }

          .payment-success-date {
            font-size: 18px !important;
            line-height: 1.18 !important;
          }

          .payment-success-time {
            font-size: 22px !important;
          }

          .payment-success-separator {
            height: 95px !important;
          }

          .payment-success-order-summary {
            margin-top: 16px !important;
            padding: 17px 16px 14px !important;
            border-radius: 16px !important;
          }

          .payment-success-order-title {
            font-size: 13px !important;
            margin-bottom: 8px !important;
          }

          .payment-success-order-row {
            padding: 8px 0 !important;
          }

          .payment-success-preparation {
            margin: 14px auto !important;
            gap: 10px !important;
            font-size: 14px !important;
            line-height: 1.35 !important;
          }

          .payment-success-service-icon {
            flex-basis: 40px !important;
            width: 40px !important;
            height: 40px !important;
          }

          .payment-success-service-icon svg {
            width: 23px !important;
            height: 23px !important;
          }

          .payment-success-divider {
            margin-bottom: 16px !important;
          }

          .payment-success-actions {
            gap: 9px !important;
          }

          .payment-success-orders-btn,
          .payment-success-home-btn {
            min-height: 52px !important;
            font-size: 16px !important;
            border-radius: 13px !important;
          }

          .payment-success-signature {
            margin-top: 16px !important;
            gap: 8px !important;
          }

          .payment-success-team {
            font-size: 18px !important;
          }
        }

          @media (max-width: 370px) {
            .payment-success-card {
              padding-left: 17px !important;
              padding-right: 17px !important;
            }


            .payment-success-basil {
              right: -12px !important;
              width: 104px !important;
              height: auto !important;
            }

            .payment-success-title {
              font-size: 28px !important;
            }
          }
      `}</style>
    </>
  );
}