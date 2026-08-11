"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function formatPickupDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  useEffect(() => {
    // Récupération du créneau AVANT de nettoyer le panier
    const savedDate =
      localStorage.getItem("sofresh_pickup_date") || "";

    const savedTime =
      localStorage.getItem("sofresh_pickup_time") || "";

    setPickupDate(savedDate);
    setPickupTime(savedTime);

    // Référence Stripe présente dans l'URL
    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      setPaymentReference(
        sessionId.slice(-10).toUpperCase()
      );
    }

    // Le paiement est validé : on vide le panier
    localStorage.removeItem("sofresh_cart");

    // Mise à jour immédiate du compteur panier dans le header
    window.dispatchEvent(
      new CustomEvent("sofresh-cart-count", {
        detail: 0,
      })
    );
  }, [searchParams]);

  return (
    <main className="login-page">
      <div
        className="login-card"
        style={{
          textAlign: "center",
          maxWidth: "520px",
        }}
      >
        <Image
          src="/logo-sofresh.png"
          alt="So Fresh"
          width={260}
          height={110}
          priority
          style={{
            width: "220px",
            height: "auto",
            marginBottom: "22px",
          }}
        />

        <div
          style={{
            width: "54px",
            height: "54px",
            margin: "0 auto 14px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#98BD12",
            color: "#ffffff",
            fontSize: "30px",
            fontWeight: "800",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            marginBottom: "10px",
          }}
        >
          Paiement confirmé
        </h1>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.5,
            color: "#555",
            marginBottom: "22px",
          }}
        >
          Votre commande a bien été enregistrée.
        </p>

        {(pickupDate || pickupTime) && (
          <div
            style={{
              padding: "16px",
              marginBottom: "18px",
              border: "1px solid #DFD178",
              borderRadius: "16px",
              background: "#F4F8DF",
              textAlign: "left",
            }}
          >
            <div
              style={{
                color: "#5A7F0D",
                fontSize: "11px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              RETRAIT
            </div>

            <strong
              style={{
                display: "block",
                color: "#263322",
                fontSize: "16px",
                lineHeight: 1.4,
                textTransform: "capitalize",
              }}
            >
              {formatPickupDate(pickupDate)}
              {pickupTime && ` • ${pickupTime}`}
            </strong>
          </div>
        )}

        {paymentReference && (
          <div
            style={{
              marginBottom: "22px",
              color: "#777",
              fontSize: "12px",
            }}
          >
            Référence paiement :{" "}
            <strong style={{ color: "#5A7F0D" }}>
              {paymentReference}
            </strong>
          </div>
        )}

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.55,
            color: "#555",
            marginBottom: "26px",
          }}
        >
          Votre commande sera préparée pour l'heure
          de retrait choisie.
        </p>

        <Link
          href="/accueil-v2"
          className="primary"
          style={{
            display: "inline-block",
            width: "100%",
            minHeight: "50px",
            lineHeight: "50px",
            textDecoration: "none",
            borderRadius: "14px",
          }}
        >
          Retour à l'accueil
        </Link>

        <p
          style={{
            marginTop: "24px",
            fontSize: "0.9rem",
            color: "#777",
          }}
        >
          Merci de votre confiance.
        </p>
      </div>
    </main>
  );
}