"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <rect x="3" y="5" width="18" height="16" rx="2" />
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
      <rect x="5" y="3" width="14" height="18" rx="2" />
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

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  const date = new Date(year, month - 1, day);

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/* =========================
   PAGE
========================= */

export default function PaymentSuccessPage() {
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  useEffect(() => {
    const savedDate =
      localStorage.getItem("sofresh_pickup_date") || "";

    const savedTime =
      localStorage.getItem("sofresh_pickup_time") || "";

    setPickupDate(savedDate);
    setPickupTime(savedTime);

    localStorage.removeItem("sofresh_cart");

    window.dispatchEvent(
      new CustomEvent("sofresh-cart-count", {
        detail: 0,
      })
    );
  }, []);

  return (
    <>
      <main
        className="payment-success-page"
        style={{
          minHeight: "100vh",
          padding: "36px 16px 60px",
          background:
            "linear-gradient(180deg, #F8F7DC 0%, #FBFAEE 100%)",
        }}
      >
        <div
          className="payment-success-card"
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: "28px",
            padding: "42px 34px 34px",
            boxShadow: "0 18px 45px rgba(82,104,26,.13)",
            border: "1px solid #EEF1DE",
            textAlign: "center",
          }}
        >
          {/* CHECK */}

          <div
            className="payment-success-check"
            style={{
              width: "100px",
              height: "100px",
              margin: "0 auto 22px",
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

          <div
            className="payment-success-kicker"
            style={{
              color: "#5A7F0D",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "1.4px",
            }}
          >
            COMMANDE VALIDÉE
          </div>

          <h1
            className="payment-success-title"
            style={{
              margin: "12px 0 0",
              color: "#17351E",
              fontSize: "38px",
              lineHeight: 1.1,
              fontWeight: "900",
            }}
          >
            Paiement confirmé
          </h1>

          <div
            className="payment-success-yellow-line"
            style={{
              width: "110px",
              height: "4px",
              borderRadius: "99px",
              margin: "18px auto 26px",
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

          {/* RETRAIT */}

          {(pickupDate || pickupTime) && (
            <div
              className="payment-success-pickup"
              style={{
                marginTop: "32px",
                padding: "27px 24px 30px",
                border: "1px solid #CFE09C",
                borderRadius: "21px",
                background:
                  "linear-gradient(180deg,#FCFDF7 0%,#F6F9EC 100%)",
              }}
            >
              <div
                className="payment-success-pickup-title"
                style={{
                  color: "#5A7F0D",
                  fontSize: "19px",
                  fontWeight: "900",
                  letterSpacing: ".5px",
                  marginBottom: "25px",
                }}
              >
                VOTRE RETRAIT
              </div>

              <div
                className="payment-success-pickup-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1px 1fr",
                  gap: "22px",
                  alignItems: "center",
                }}
              >
                {/* DATE */}

                <div>
                  <div
                    className="payment-success-icon-box"
                    style={{
                      width: "62px",
                      height: "62px",
                      margin: "0 auto 12px",
                      borderRadius: "17px",
                      background: "#ffffff",
                      color: "#5A7F0D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 6px 18px rgba(40,70,20,.08)",
                    }}
                  >
                    <CalendarIcon />
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#696E64",
                      fontWeight: "900",
                      marginBottom: "7px",
                    }}
                  >
                    DATE
                  </div>

                  <strong
                    className="payment-success-date"
                    style={{
                      color: "#17351E",
                      fontSize: "22px",
                      lineHeight: 1.25,
                      display: "block",
                    }}
                  >
                    {pickupDate
                      ? formatPickupDate(pickupDate)
                      : "—"}
                  </strong>
                </div>

                {/* SEPARATEUR */}

                <div
                  className="payment-success-separator"
                  style={{
                    width: "1px",
                    height: "125px",
                    background: "#DCE6BF",
                  }}
                />

                {/* HEURE */}

                <div>
                  <div
                    className="payment-success-icon-box"
                    style={{
                      width: "62px",
                      height: "62px",
                      margin: "0 auto 12px",
                      borderRadius: "17px",
                      background: "#ffffff",
                      color: "#5A7F0D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 6px 18px rgba(40,70,20,.08)",
                    }}
                  >
                    <ClockIcon />
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#696E64",
                      fontWeight: "900",
                      marginBottom: "7px",
                    }}
                  >
                    HEURE
                  </div>

                  <strong
                    className="payment-success-time"
                    style={{
                      color: "#17351E",
                      fontSize: "26px",
                      lineHeight: 1.2,
                      display: "block",
                    }}
                  >
                    {pickupTime || "—"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* PREPARATION */}

          <div
            className="payment-success-preparation"
            style={{
              margin: "28px auto",
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

            <span style={{ textAlign: "left" }}>
              Votre commande sera préparée
              <br />
              pour ce créneau de retrait.
            </span>
          </div>

          <div
            className="payment-success-divider"
            style={{
              height: "1px",
              background: "#E5EAD7",
              marginBottom: "24px",
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
              href="/compte/commandes"
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
                gridTemplateColumns: "35px 1fr 35px",
                alignItems: "center",
                fontSize: "18px",
                fontWeight: "900",
                boxShadow:
                  "0 8px 18px rgba(127,166,0,.18)",
              }}
            >
              <OrderIcon />

              <span>Voir ma commande</span>

              <ArrowIcon />
            </Link>

            <Link
              href="/accueil-v2"
              className="payment-success-home-btn"
              style={{
                minHeight: "60px",
                padding: "0 20px",
                borderRadius: "15px",
                border: "2px solid #98BD12",
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
              marginTop: "31px",
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
              <div>Merci de votre confiance,</div>

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
        @media (max-width: 640px) {
          .payment-success-page {
            padding: 12px 10px 30px !important;
          }

          .payment-success-card {
            border-radius: 22px !important;
            padding: 22px 18px 24px !important;
          }

          .payment-success-check {
            width: 72px !important;
            height: 72px !important;
            margin-bottom: 12px !important;
          }

          .payment-success-check svg {
            width: 42px !important;
            height: 42px !important;
          }

          .payment-success-kicker {
            font-size: 11px !important;
            letter-spacing: 1px !important;
          }

          .payment-success-title {
            margin-top: 7px !important;
            font-size: 30px !important;
            line-height: 1.05 !important;
          }

          .payment-success-yellow-line {
            width: 82px !important;
            height: 3px !important;
            margin: 12px auto 14px !important;
          }

          .payment-success-intro {
            font-size: 15px !important;
          }

          .payment-success-pickup {
            margin-top: 18px !important;
            padding: 18px 14px 20px !important;
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

          .payment-success-preparation {
            margin: 17px auto !important;
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
            margin-top: 20px !important;
            gap: 8px !important;
          }

          .payment-success-team {
            font-size: 18px !important;
          }
        }
      `}</style>
    </>
  );
}