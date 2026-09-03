"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function seConnecter(event: React.FormEvent) {
    event.preventDefault();

    setChargement(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      setMessage("E-mail ou mot de passe incorrect.");
      setChargement(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <a
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          ←
        </a>

        <div className="mt-10">
          <p className="text-sm font-medium text-[#5BA651]">
            Mon compte
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Connexion
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Connectez-vous pour retrouver vos plantes et vos conseils personnalisés.
          </p>
        </div>

        <form
          onSubmit={seConnecter}
          className="mt-8 rounded-3xl bg-white p-6 shadow-sm"
        >
          <label className="text-sm font-medium">
            Adresse e-mail
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="votre@email.fr"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          <label className="mt-5 block text-sm font-medium">
            Mot de passe
          </label>

          <input
            type="password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            required
            placeholder="Votre mot de passe"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          {message && (
            <p className="mt-4 text-sm text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ? Nous créerons l'inscription ensuite.
        </p>
      </div>
    </main>
  );
}