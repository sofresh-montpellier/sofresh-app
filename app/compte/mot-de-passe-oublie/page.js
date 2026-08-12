"use client";

import { useState } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Le service est momentanément indisponible.");
      return;
    }

    if (!email) {
      setErrorMessage("Veuillez renseigner votre adresse e-mail.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: "http://localhost:3000",
        }
      );

    if (error) {
  console.error("ERREUR SUPABASE RESET :", error);
  setErrorMessage(error.message);
  return;
}

      setMessage(
        "Un e-mail de réinitialisation vient de vous être envoyé."
      );
    } catch (error) {
      console.error("Erreur mot de passe oublié :", error);
      setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <h1>Mot de passe oublié</h1>

        <p className="account-intro">
          Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation.
        </p>

        <form
          className="account-login-form"
          onSubmit={handleSubmit}
        >
          <label>
            Adresse e-mail
            <input
              type="email"
              placeholder="votre@email.fr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {errorMessage && (
            <p
              style={{
                color: "#a93434",
                fontSize: "12px",
                textAlign: "center",
                margin: "0 0 12px",
              }}
            >
              {errorMessage}
            </p>
          )}

          {message && (
            <p
              style={{
                color: "#5A7F0D",
                fontSize: "12px",
                textAlign: "center",
                margin: "0 0 12px",
                fontWeight: "700",
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="account-login-btn"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <Link
          href="/compte/connexion"
          className="account-back-link"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}