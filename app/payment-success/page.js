"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
    const savedDate =
      localStorage.getItem("sofresh_pickup_date") || "";

    const savedTime =
      localStorage.getItem("sofresh_pickup_time") || "";

    setPickupDate(savedDate);
    setPickupTime(savedTime);

    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      setPaymentReference(
        sessionId.slice(-10).toUpperCase()
      );
    }

    localStorage.removeItem("sofresh_cart");

    window.dispatchEvent(
      new CustomEvent("sofresh-cart-count", {
        detail: 0,
      })
    );
  }, [searchParams]);

  return (
    <main className="payment-success-page">
      <div className="payment-success-card">

        <div className="payment-success-check">
          ✓
        </div>

        <p className="payment-success-kicker">
          COMMANDE VALIDÉE
        </p>

        <h1>Paiement confirmé</h1>

        <p className="payment-success-intro">
          Votre commande a bien été enregistrée.
        </p>

        {(pickupDate || pickupTime) && (
          <div className="payment-success-pickup">
            <span>RETRAIT</span>

            <strong>
              {formatPickupDate(pickupDate)}
              {pickupTime && ` · ${pickupTime}`}
            </strong>
          </div>
        )}

        {paymentReference && (
          <p className="payment-success-reference">
            Référence paiement{" "}
            <strong>{paymentReference}</strong>
          </p>
        )}

        <p className="payment-success-text">
          Votre commande sera préparée pour l’heure
          de retrait choisie.
        </p>

        <div className="payment-success-actions">
          <Link
            href="/compte/commandes"
            className="payment-success-orders-btn"
          >
            Voir ma commande
          </Link>

          <Link
            href="/accueil-v2"
            className="payment-success-home-btn"
          >
            Retour à l’accueil
          </Link>
        </div>

        <p className="payment-success-thanks">
          Merci de votre confiance.
        </p>
      </div>
    </main>
  );
}