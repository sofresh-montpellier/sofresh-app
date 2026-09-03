"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function InscriptionPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function creerCompte(event: React.FormEvent) {
    event.preventDefault();

    setChargement(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
    });

    if (error) {
      setMessage(error.message);
      setChargement(false);
      return;
    }

    setMessage(
      "Compte créé. Vérifiez votre e-mail si Supabase demande une confirmation."
    );
    setChargement(false);
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <a
          href="/connexion"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          ←
        </a>

        <div className="mt-10">
          <p className="text-sm font-medium text-[#5BA651]">
            Mon compte
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Créer mon compte
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Créez votre compte pour enregistrer vos plantes et retrouver votre jardin.
          </p>
        </div>

        <form
          onSubmit={creerCompte}
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
            minLength={6}
            placeholder="6 caractères minimum"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          {message && (
            <p className="mt-4 text-sm text-gray-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white"
          >
            {chargement ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </div>
    </main>
  );
}