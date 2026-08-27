"use client";

import Link from "next/link";

export default function ConfidentialitePage() {
  return (
    <main className="account-page">
      <div className="account-container legal-page">
        <Link
          href="/compte"
          className="account-back-link"
        >
          ← Retour à mon compte
        </Link>

        <h1>Politique de confidentialité</h1>

        <div className="legal-card">
          <h2>Responsable du traitement</h2>

          <p>
            Les données personnelles collectées dans
            l’application So Fresh Salad sont traitées par :
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
        </div>

        <div className="legal-card">
          <h2>Données collectées</h2>

          <p>
            Selon votre utilisation de l’application,
            So Fresh peut notamment collecter :
          </p>

          <ul>
            <li>votre prénom et votre nom ;</li>
            <li>votre adresse e-mail ;</li>
            <li>votre numéro de téléphone ;</li>
            <li>les informations liées à vos commandes ;</li>
            <li>
              la date et l’heure choisies pour le retrait ;
            </li>
            <li>
              votre historique de commandes ;
            </li>
            <li>
              vos choix concernant les communications
              commerciales par e-mail ou SMS.
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>Utilisation de vos données</h2>

          <p>
            Ces informations sont utilisées afin de :
          </p>

          <ul>
            <li>créer et gérer votre compte So Fresh ;</li>
            <li>traiter et préparer vos commandes ;</li>
            <li>
              vous permettre de consulter votre historique ;
            </li>
            <li>
              gérer le retrait de votre commande ;
            </li>
            <li>
              assurer le fonctionnement et la sécurité
              de l’application ;
            </li>
            <li>
              vous adresser des communications commerciales
              uniquement lorsque vous y avez consenti.
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>Paiement</h2>

          <p>
            Les paiements en ligne sont traités par Stripe.
            So Fresh ne conserve pas les données complètes
            de votre carte bancaire.
          </p>
        </div>

        <div className="legal-card">
          <h2>Services utilisés</h2>

          <p>
            So Fresh utilise notamment Supabase pour
            l’authentification et la gestion des données,
            Stripe pour le paiement et Vercel pour
            l’hébergement de l’application.
          </p>
        </div>

        <div className="legal-card">
          <h2>Durée de conservation</h2>

          <p>
            Les données sont conservées pendant la durée
            nécessaire à la gestion de votre compte,
            de vos commandes et au respect des obligations
            légales applicables.
          </p>
        </div>

        <div className="legal-card">
          <h2>Vos droits</h2>

          <p>
            Conformément à la réglementation applicable,
            vous pouvez demander l’accès, la rectification
            ou, lorsque cela est possible, la suppression
            de vos données personnelles.
          </p>

          <p>
            Vous pouvez également demander la limitation
            du traitement ou vous opposer à certaines
            utilisations de vos données.
          </p>

          <p>
            Pour exercer vos droits, contactez So Fresh
            à l’adresse e-mail habituelle de l’établissement.
          </p>
        </div>

        <div className="legal-card">
          <h2>Communications commerciales</h2>

          <p>
            Les communications commerciales par e-mail
            ou SMS ne sont envoyées que lorsque vous avez
            donné votre accord.
          </p>

          <p>
            Vous pouvez retirer ce consentement à tout moment.
          </p>
        </div>
      </div>
    </main>
  );
}