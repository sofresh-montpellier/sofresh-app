"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function NouveauMotDePassePage() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const [succes, setSucces] = useState(false);

  async function modifierMotDePasse(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setSucces(false);

    if (motDePasse.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    if (error) {
      setMessage(
        "Impossible de modifier le mot de passe. Le lien est peut-être expiré. Demandez un nouveau lien."
      );
      setChargement(false);
      return;
    }

    setSucces(true);
    setMessage("Votre mot de passe a bien été modifié.");
    setChargement(false);

    setTimeout(() => {
      window.location.href = "/connexion";
    }, 1500);
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
            Nouveau mot de passe
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Choisissez votre nouveau mot de passe pour accéder à Feuillia.
          </p>
        </div>

        <form
          onSubmit={modifierMotDePasse}
          className="mt-8 rounded-3xl bg-white p-6 shadow-sm"
        >
          <label className="text-sm font-medium">
            Nouveau mot de passe
          </label>

          <input
            type="password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          <label className="mt-5 block text-sm font-medium">
            Confirmer le mot de passe
          </label>

          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Retapez votre mot de passe"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          {message && (
            <p
              className={`mt-4 text-sm ${
                succes ? "text-[#5BA651]" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white disabled:opacity-60"
          >
            {chargement
              ? "Modification..."
              : "Modifier mon mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}