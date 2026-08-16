"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function NouveauMotDePassePage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Le service est momentanément indisponible.");
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage("Veuillez renseigner les deux champs.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("ERREUR SUPABASE UPDATE PASSWORD :", error);
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Votre mot de passe a bien été modifié.");

      setTimeout(() => {
        router.push("/compte/connexion");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("Erreur nouveau mot de passe :", error);
      setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <h1>Nouveau mot de passe</h1>

        <p className="account-intro">
          Choisissez votre nouveau mot de passe So Fresh.
        </p>

        <form
          className="account-login-form"
          onSubmit={handleSubmit}
        >
         <label>
  Nouveau mot de passe

  <div className="password-field">
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Votre nouveau mot de passe"
      autoComplete="new-password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      required
    />

    <button
      type="button"
      className="password-eye"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={
        showPassword
          ? "Masquer le mot de passe"
          : "Afficher le mot de passe"
      }
    >
      <svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
  <circle cx="12" cy="12" r="2.5" />
</svg>
    </button>
  </div>
</label>

       <label>
  Confirmer le mot de passe

  <div className="password-field">
    <input
      type={showConfirmPassword ? "text" : "password"}
      placeholder="Confirmez votre mot de passe"
      autoComplete="new-password"
      value={confirmPassword}
      onChange={(event) => setConfirmPassword(event.target.value)}
      required
    />

    <button
      type="button"
      className="password-eye"
      onClick={() =>
        setShowConfirmPassword(!showConfirmPassword)
      }
      aria-label={
        showConfirmPassword
          ? "Masquer le mot de passe"
          : "Afficher le mot de passe"
      }
    >
      <svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
  <circle cx="12" cy="12" r="2.5" />
</svg>
    </button>
  </div>
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

          {successMessage && (
            <p
              style={{
                color: "#5A7F0D",
                fontSize: "12px",
                textAlign: "center",
                margin: "0 0 12px",
                fontWeight: "700",
              }}
            >
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            className="account-login-btn"
            disabled={loading}
          >
            {loading ? "Modification..." : "Modifier mon mot de passe"}
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