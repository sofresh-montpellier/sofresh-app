"use client";

import Link from "next/link";

export default function ComptePage() {
  return (
    <main className="account-page">
      <div className="account-container">

      

        <h1>Mon compte</h1>

        <p className="account-intro">
          Connectez-vous ou créez votre compte So Fresh
        </p>

        <div className="account-actions">
          <Link href="/login" className="account-login-btn">
            Se connecter
          </Link>

          <button
            type="button"
            className="account-create-btn"
          >
            Créer mon compte
          </button>
        </div>

        <div className="account-benefits">
          <h2>Pourquoi créer un compte ?</h2>

          <div className="account-benefit">
            <span>★</span>
            <div>
              <strong>Profitez de votre fidélité</strong>
              <p>Cumulez des points à chaque commande.</p>
            </div>
          </div>

          <div className="account-benefit">
            <span>↻</span>
            <div>
              <strong>Commandez plus rapidement</strong>
              <p>
                Retrouvez vos informations lors de vos prochaines commandes.
              </p>
            </div>
          </div>

          <div className="account-benefit">
            <span>✓</span>
            <div>
              <strong>Retrouvez vos commandes</strong>
              <p>Consultez facilement votre historique.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}