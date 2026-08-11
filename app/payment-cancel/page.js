import Link from "next/link";
import Image from "next/image";

export default function PaymentCancelPage() {
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
          Paiement annulé
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "10px",
          }}
        >
          Aucun paiement n’a été effectué.
        </p>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "36px",
          }}
        >
          Votre commande est toujours dans votre panier.
        </p>

        <Link
          href="/commander"
          className="primary"
          style={{
            display: "inline-block",
            minWidth: "240px",
            textDecoration: "none",
          }}
        >
          Revenir au panier
        </Link>

        <p
          style={{
            marginTop: "34px",
            fontSize: "0.95rem",
            color: "#777",
          }}
        >
          Vous pouvez modifier votre commande ou réessayer le paiement.
        </p>
      </div>
    </main>
  );
}