"use client";

import Link from "next/link";

export default function MentionsLegalesPage() {
  return (
    <main className="account-page">
      <div className="account-container legal-page">
        <Link
          href="/compte"
          className="account-back-link"
        >
          ← Retour à mon compte
        </Link>

        <h1>Mentions légales</h1>

        <div className="legal-card">
          <h2>Éditeur de l’application</h2>

          <p>
            L’application So Fresh Salad est éditée par :
          </p>

          <p>
            <strong>SARL LE VINTAGE</strong>
            <br />
            Enseigne : So Fresh Salad
            <br />
            1350 avenue Albert Einstein
            <br />
            34000 Montpellier
          </p>

          <p>
            SIREN : 793 703 059
            <br />
            SIRET : 793 703 059 00030
          </p>

          <p>
            Gérante : <strong>Carole Tarrazona</strong>
            <br />
            Responsable de la publication :{" "}
            <strong>Carole Tarrazona</strong>
          </p>
        </div>

        <div className="legal-card">
          <h2>Contact</h2>

          <p>
            Pour toute question concernant So Fresh Salade,
            vous pouvez nous contacter à l’adresse suivante :
          </p>

          <p>
            <strong>sofreshsalade@gmail.com</strong>
          </p>
        </div>

        <div className="legal-card">
          <h2>Hébergement</h2>

          <p>
            L’application est hébergée par Vercel.
          </p>
        </div>

        <div className="legal-card">
          <h2>Services techniques</h2>

          <p>
            L’application utilise notamment Supabase
            pour l’authentification et la gestion des données,
            ainsi que Stripe pour le paiement en ligne.
          </p>
        </div>

        <div className="legal-card">
          <h2>Propriété intellectuelle</h2>

          <p>
            Les contenus, textes, visuels, logos et éléments
            graphiques présents dans l’application So Fresh
            Salade sont protégés et ne peuvent être reproduits,
            représentés ou utilisés sans autorisation préalable.
          </p>
        </div>
      </div>
    </main>
  );
}