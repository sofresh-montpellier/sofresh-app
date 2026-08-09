import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand">
          SO <span>FRESH</span>
        </div>

        <h1>Paiement annulé</h1>

        <p>
          Aucun paiement n’a été effectué et aucune commande n’a été prise en compte.
        </p>

        <Link href="/" className="primary">
          Revenir au panier
        </Link>
      </div>
    </main>
  );
}