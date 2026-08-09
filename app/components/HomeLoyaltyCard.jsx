import Image from "next/image";
import Link from "next/link";

export default function HomeLoyaltyCard() {
  return (
    <Link
      href="/fidelite"
      className="home-loyalty-image-card"
    >
      <Image
        src="/fidelite-sofresh.jpg"
        alt="Programme fidélité So Fresh Salade"
        fill
        sizes="(max-width: 640px) 100vw, 520px"
        className="home-loyalty-image"
      />

      <div className="home-loyalty-image-overlay" />

      <div className="home-loyalty-image-content">
        <span>MON COMPTE</span>
        <strong>FIDÉLITÉ</strong>

        <p>
          Cumulez des points à chaque commande et
          profitez bientôt de récompenses exclusives.
        </p>

        <span className="home-loyalty-image-button">
          Voir mon compte
        </span>
      </div>
    </Link>
  );
}