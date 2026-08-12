"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("La connexion est momentanément indisponible.");
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
        setErrorMessage("E-mail ou mot de passe incorrect.");
        return;
      }

      const connectedUser = data?.user;

      if (connectedUser) {
        const metadata = connectedUser.user_metadata || {};

        const firstName = metadata.first_name || "";
        const lastName = metadata.last_name || "";
        const phone = metadata.phone || "";

        const emailOptIn =
          metadata.email_opt_in === true;

        const smsOptIn =
          metadata.sms_opt_in === true;

        // -----------------------------
        // ENREGISTREMENT DE LA CONNEXION
        // -----------------------------

        const { error: loginEventError } = await supabase
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

        // --------------------------------
        // ENREGISTREMENT CONTACT MARKETING
        // UNE SEULE FOIS
        // --------------------------------

        const marketingAlreadySaved =
          metadata.marketing_contact_saved === true;

        if (!marketingAlreadySaved) {
          const { error: marketingError } = await supabase
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
      console.error("Erreur connexion :", error);

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
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
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

          <button
            type="submit"
            className="account-login-btn"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
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