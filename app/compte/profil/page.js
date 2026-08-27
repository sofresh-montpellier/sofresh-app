"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../lib/supabase";

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setFirstName(
        user.user_metadata?.first_name || ""
      );

      setLastName(
        user.user_metadata?.last_name || ""
      );

      setPhone(
        user.user_metadata?.phone || ""
      );

      setEmail(user.email || "");

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave(event) {
    event.preventDefault();

    if (!supabase) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      },
    });

    if (error) {
      console.error(
        "Erreur mise à jour profil :",
        error
      );

      setMessage(
        "Impossible d’enregistrer vos informations."
      );

      setSaving(false);
      return;
    }

    localStorage.setItem(
      "sofresh_customer_name",
      `${firstName} ${lastName}`.trim()
    );

    localStorage.setItem(
      "sofresh_customer_phone",
      phone.trim()
    );

    setMessage(
      "Vos informations ont bien été enregistrées."
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-container">
          <p className="account-intro">
            Chargement de votre profil...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <Link
          href="/compte"
          className="account-back-link"
        >
          ← Retour à mon compte
        </Link>

        <h1>Mon profil</h1>

        <p className="account-intro">
          Modifiez vos informations personnelles.
        </p>

        <form
          onSubmit={handleSave}
          className="account-profile-form"
        >
          <label htmlFor="first-name">
            Prénom
          </label>

          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(event) =>
              setFirstName(event.target.value)
            }
            placeholder="Votre prénom"
            autoComplete="given-name"
          />

          <label htmlFor="last-name">
            Nom
          </label>

          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={(event) =>
              setLastName(event.target.value)
            }
            placeholder="Votre nom"
            autoComplete="family-name"
          />

          <label htmlFor="phone">
            Téléphone
          </label>

          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            placeholder="06 00 00 00 00"
            autoComplete="tel"
          />

          <label htmlFor="email">
            E-mail
          </label>

          <input
            id="email"
            type="email"
            value={email}
            disabled
          />

          <p className="account-profile-email-note">
            L’adresse e-mail ne peut pas être modifiée ici.
          </p>

          <button
            type="submit"
            className="account-login-btn"
            disabled={saving}
          >
            {saving
              ? "Enregistrement..."
              : "Enregistrer mes modifications"}
          </button>

          {message && (
            <p className="account-profile-message">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}