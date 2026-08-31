"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function ConnexionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const inscriptionOk =
    searchParams.get("inscription") === "ok";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showResendConfirmation, setShowResendConfirmation] =
    useState(false);

  const [resendLoading, setResendLoading] =
    useState(false);

  const [resendMessage, setResendMessage] =
    useState("");

  async function handleResendConfirmation() {
    setErrorMessage("");
    setResendMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Le service est momentanément indisponible."
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        "Indiquez votre adresse e-mail avant de renvoyer le message de confirmation."
      );
      return;
    }

    try {
      setResendLoading(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        console.error(
          "Erreur renvoi e-mail confirmation :",
          error
        );

        setErrorMessage(
          "Impossible de renvoyer l'e-mail pour le moment. Veuillez réessayer."
        );

        return;
      }

      setResendMessage(
        "E-mail de confirmation envoyé. Consultez votre boîte de réception et pensez à vérifier vos courriers indésirables (spam)."
      );
    } catch (error) {
      console.error(
        "Erreur renvoi confirmation :",
        error
      );

      setErrorMessage(
        "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setResendMessage("");
    setShowResendConfirmation(false);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "La connexion est momentanément indisponible."
      );
      return;
    }

    if (!email || !password) {
      setErrorMessage(
        "Veuillez renseigner votre e-mail et votre mot de passe."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        const message =
          error.message?.toLowerCase() || "";

        if (
          message.includes("email not confirmed") ||
          message.includes("email_not_confirmed")
        ) {
          setErrorMessage(
            "Votre adresse e-mail n’a pas encore été confirmée."
          );

          setShowResendConfirmation(true);
          return;
        }

        setErrorMessage(
          "E-mail ou mot de passe incorrect."
        );

        return;
      }

      const connectedUser = data?.user;

      if (connectedUser) {
        const metadata =
          connectedUser.user_metadata || {};

        const firstName =
          metadata.first_name || "";

        const lastName =
          metadata.last_name || "";

        const phone =
          metadata.phone || "";

        const emailOptIn =
          metadata.email_opt_in === true ||
          metadata.email_marketing === true;

        const smsOptIn =
          metadata.sms_opt_in === true ||
          metadata.sms_marketing === true;

        // -----------------------------
        // HISTORIQUE DES CONNEXIONS
        // -----------------------------

        const { error: loginEventError } =
          await supabase
            .from("login_events")
            .insert({
              user_id: connectedUser.id,
              email: connectedUser.email,
              first_name: firstName,
              last_name: lastName,
            });

        if (loginEventError) {
          console.error(
            "Erreur enregistrement login_events :",
            loginEventError
          );
        }

        // -----------------------------
        // CONTACT MARKETING
        // UNE SEULE FOIS
        // -----------------------------

        const marketingAlreadySaved =
          metadata.marketing_contact_saved === true;

        if (!marketingAlreadySaved) {
          const { error: marketingError } =
            await supabase
              .from("marketing_contacts")
              .insert({
                user_id: connectedUser.id,
                first_name: firstName,
                last_name: lastName,
                email: connectedUser.email,
                phone: phone,
                email_opt_in: emailOptIn,
                sms_opt_in: smsOptIn,
              });

          if (marketingError) {
            console.error(
              "Erreur enregistrement marketing_contacts :",
              marketingError
            );
          } else {
            const { error: metadataError } =
              await supabase.auth.updateUser({
                data: {
                  ...metadata,
                  marketing_contact_saved: true,
                },
              });

            if (metadataError) {
              console.error(
                "Erreur mise à jour metadata marketing :",
                metadataError
              );
            }
          }
        }
      }

      router.push("/compte");
      router.refresh();
    } catch (error) {
      console.error(
        "Erreur connexion :",
        error
      );

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
        <h1>Se connecter</h1>

        <p className="account-intro">
          Connectez-vous à votre compte So Fresh
        </p>

        {inscriptionOk && (
          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "#F4F8DF",
              border: "1px solid #DFD178",
              color: "#365718",
              fontSize: "13px",
              lineHeight: "1.5",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Compte créé avec succès
            </strong>

            Consultez votre boîte e-mail et confirmez
            votre adresse avant de vous connecter.
          </div>
        )}

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
              onChange={(event) => {
                setEmail(event.target.value);
                setResendMessage("");
                setShowResendConfirmation(false);
              }}
              required
            />
          </label>

          <label>
            Mot de passe

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
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

          <Link
            href="/compte/mot-de-passe-oublie"
            className="account-forgot-password"
          >
            Mot de passe oublié ?
          </Link>

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

          {resendMessage && (
            <p
              style={{
                color: "#5A7F0D",
                background: "#F4F8DF",
                border: "1px solid #DFD178",
                borderRadius: "12px",
                padding: "10px 12px",
                fontSize: "12px",
                lineHeight: "1.5",
                textAlign: "center",
                margin: "0 0 12px",
              }}
            >
              {resendMessage}
            </p>
          )}

          <button
            type="submit"
            className="account-login-btn"
            disabled={loading || resendLoading}
          >
            {loading
              ? "Connexion..."
              : "Se connecter"}
          </button>

          {showResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading || loading}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "11px 14px",
                borderRadius: "12px",
                border: "1px solid #98BD12",
                background: "#ffffff",
                color: "#5A7F0D",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {resendLoading
                ? "Envoi en cours..."
                : "Renvoyer l’e-mail de confirmation"}
            </button>
          )}
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