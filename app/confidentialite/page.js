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

          <p>
            Contact :{" "}
            <strong>sofreshsalade@gmail.com</strong>
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
            <li>votre historique de commandes ;</li>
            <li>
              vos choix concernant les communications
              commerciales par e-mail ou SMS.
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>Finalités du traitement</h2>

          <p>
            Les données personnelles collectées sont utilisées
            afin de :
          </p>

          <ul>
            <li>créer et gérer votre compte So Fresh ;</li>
            <li>vous authentifier dans l’application ;</li>
            <li>traiter et préparer vos commandes ;</li>
            <li>gérer le retrait de vos commandes ;</li>
            <li>
              vous permettre de consulter votre historique
              de commandes ;
            </li>
            <li>
              assurer le bon fonctionnement et la sécurité
              de l’application ;
            </li>
            <li>
              gérer le programme de fidélité lorsque celui-ci
              est applicable ;
            </li>
            <li>
              vous adresser des communications commerciales
              uniquement lorsque vous y avez consenti.
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>Base légale</h2>

          <p>
            Les traitements nécessaires à la création de votre
            compte, à la gestion de vos commandes et à leur
            paiement sont réalisés afin de permettre
            l’exécution du service demandé.
          </p>

          <p>
            Les communications commerciales par e-mail ou SMS
            reposent sur votre consentement lorsque celui-ci
            est requis.
          </p>

          <p>
            Certaines données peuvent également être conservées
            afin de respecter les obligations légales
            applicables à So Fresh.
          </p>
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
          <h2>Destinataires et services utilisés</h2>

          <p>
            Les données sont accessibles uniquement aux
            personnes et prestataires qui en ont besoin pour
            assurer le fonctionnement du service.
          </p>

          <p>
            So Fresh utilise notamment :
          </p>

          <ul>
            <li>
              Supabase pour l’authentification et la gestion
              des données ;
            </li>
            <li>Stripe pour le paiement en ligne ;</li>
            <li>Vercel pour l’hébergement de l’application.</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>Durée de conservation</h2>

          <p>
            Les données personnelles sont conservées pendant
            une durée adaptée à leur finalité et pendant la
            durée nécessaire à la gestion de votre compte,
            de vos commandes et au respect des obligations
            légales applicables.
          </p>

          <p>
            Les données ne sont pas conservées plus longtemps
            que nécessaire au regard de ces objectifs.
          </p>
        </div>

        <div className="legal-card">
          <h2>Vos droits</h2>

          <p>
            Conformément à la réglementation applicable,
            vous pouvez notamment demander l’accès,
            la rectification ou, lorsque les conditions
            sont réunies, l’effacement de vos données
            personnelles.
          </p>

          <p>
            Vous pouvez également demander la limitation
            du traitement, vous opposer à certains traitements
            ou exercer votre droit à la portabilité lorsque
            celui-ci est applicable.
          </p>

          <p>
            Lorsque le traitement repose sur votre
            consentement, vous pouvez retirer celui-ci
            à tout moment.
          </p>

          <p>
            Pour exercer vos droits, contactez So Fresh à :
            <br />
            <strong>sofreshsalade@gmail.com</strong>
          </p>

          <p>
            Vous disposez également du droit d’introduire
            une réclamation auprès de la Commission nationale
            de l’informatique et des libertés (CNIL).
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

        <div className="legal-card">
          <h2>Sécurité des données</h2>

          <p>
            So Fresh met en œuvre des mesures techniques
            et organisationnelles destinées à protéger
            les données personnelles contre l’accès,
            la modification, la divulgation ou la destruction
            non autorisés.
          </p>
        </div>
      </div>
    </main>
  );
}