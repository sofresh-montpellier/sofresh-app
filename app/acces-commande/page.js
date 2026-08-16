"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../lib/supabase";

export default function AccesCommandePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      if (!isSupabaseConfigured || !supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (user.email_confirmed_at) {
        router.replace("/commander");
      }
    }

    checkAccess();
  }, [router]);

  return (
    <main className="access-gate-page">
      <section className="access-gate-photo">
        <img
          src="/facade1-sofresh.jpeg"
          alt="Façade So Fresh Montpellier Millénaire"
          className="access-gate-facade"
        />

        <img
          src="/logo-carre.png"
          alt="So Fresh Salade"
          className="access-gate-logo"
        />
      </section>

      <section className="access-gate-panel">
        <p className="access-gate-kicker">
          SO FRESH MONTPELLIER MILLÉNAIRE
        </p>

        <h1 className="access-gate-title">
          Commandez votre pause
          <span>fraîche & gourmande</span>
        </h1>

        <p className="access-gate-text">
          Connectez-vous avec votre compte So Fresh
          pour accéder à notre carte et passer votre commande.
        </p>

        <Link
          href="/compte/connexion"
          className="access-gate-login"
        >
          <svg
            viewBox="0 0 24 24"
            width="23"
            height="23"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>

          <span>Se connecter</span>
        </Link>

        <Link
          href="/compte/inscription"
          className="access-gate-register"
        >
          <svg
            viewBox="0 0 24 24"
            width="23"
            height="23"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21a7 7 0 0 1 14 0" />
            <path d="M19 8v6" />
            <path d="M16 11h6" />
          </svg>

          <span>Créer mon compte</span>
        </Link>

        <p className="access-gate-note">
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 4c-8 0-14 5-14 12" />
            <path d="M6 16c4 0 9-3 12-8" />
            <path d="M6 16c0 2-1 3-2 4" />
          </svg>

          <span>
            Un compte valide est nécessaire pour commander.
          </span>
        </p>
      </section>
    </main>
  );
}