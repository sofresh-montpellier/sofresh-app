"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function InscriptionPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "L'inscription est momentanément indisponible."
      );
      return;
    }

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    try {
      setLoading(true);

      const marketingConsentAt =
        emailOptIn || smsOptIn
          ? new Date().toISOString()
          : null;

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),

            email_opt_in: emailOptIn,
            sms_opt_in: smsOptIn,
            marketing_consent_at: marketingConsentAt,
          },
        },
      });

      if (error) {
        console.error("Erreur inscription Supabase :", error);
        setErrorMessage(error.message);
        return;
      }

      router.push("/compte/connexion");
      router.refresh();
    } catch (error) {
      console.error("Erreur inscription :", error);

      setErrorMessage(
        "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <h1>Créer mon compte</h1>

        <p className="account-intro">
          Créez votre compte So Fresh en quelques secondes
        </p>

        <form
          className="account-login-form account-register-form"
          onSubmit={handleSubmit}
        >
          <label>
            Prénom
            <input
              type="text"
              value={firstName}
              onChange={(event) =>
                setFirstName(event.target.value)
              }
              autoComplete="given-name"
              required
            />
          </label>

          <label>
            Nom
            <input
              type="text"
              value={lastName}
              onChange={(event) =>
                setLastName(event.target.value)
              }
              autoComplete="family-name"
              required
            />
          </label>

          <label>
            Téléphone
            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              autoComplete="tel"
              required
            />
          </label>

          <label>
            Adresse e-mail
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <label>
  Mot de passe

  <div className="password-field">
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(event) =>
        setPassword(event.target.value)
      }
      autoComplete="new-password"
      required
    />

    <button
      type="button"
      className="password-eye"
      onClick={() =>
        setShowPassword(!showPassword)
      }
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
      value={confirmPassword}
      onChange={(event) =>
        setConfirmPassword(event.target.value)
      }
      autoComplete="new-password"
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

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "4px",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: "9px",
                fontSize: "12px",
                lineHeight: "1.35",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={emailOptIn}
                onChange={(event) =>
                  setEmailOptIn(event.target.checked)
                }
                style={{
                  width: "17px",
                  height: "17px",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              />

              <span>
                Je souhaite recevoir les nouveautés et offres
                So Fresh par e-mail.
              </span>
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: "9px",
                fontSize: "12px",
                lineHeight: "1.35",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(event) =>
                  setSmsOptIn(event.target.checked)
                }
                style={{
                  width: "17px",
                  height: "17px",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              />

              <span>
                Je souhaite recevoir les nouveautés et offres
                So Fresh par SMS.
              </span>
            </label>
          </div>

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

          <button
            type="submit"
            className="account-login-btn"
            disabled={loading}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <Link
          href="/compte"
          className="account-back-link"
        >
          Retour à Mon compte
        </Link>
      </div>
    </main>
  );
}