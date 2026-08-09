import Link from "next/link";
import Image from "next/image";

export default function PaymentSuccessPage() {
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
            marginBottom: "28px",
          }}
        />

        <h1
          style={{
            marginBottom: "18px",
          }}
        >
          Paiement confirmé
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "10px",
          }}
        >
          Votre paiement a bien été accepté.
        </p>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "36px",
          }}
        >
          Votre commande est en cours de préparation.
        </p>

        <Link
          href="/"
          className="primary"
          style={{
            display: "inline-block",
            minWidth: "240px",
            textDecoration: "none",
          }}
        >
          Retour à l'accueil
        </Link>

        <p
          style={{
            marginTop: "34px",
            fontSize: "0.95rem",
            color: "#777",
          }}
        >
          Merci de votre confiance.
        </p>
      </div>
    </main>
  );
}