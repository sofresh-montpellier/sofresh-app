"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const [typeMessage, setTypeMessage] = useState<"erreur" | "succes">("erreur");

  async function seConnecter(event: React.FormEvent) {
    event.preventDefault();

    setChargement(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      setTypeMessage("erreur");
      setMessage("E-mail ou mot de passe incorrect.");
      setChargement(false);
      return;
    }

    window.location.href = "/";
  }

  async function motDePasseOublie() {
    setMessage("");

    if (!email.trim()) {
      setTypeMessage("erreur");
      setMessage("Saisissez d'abord votre adresse e-mail.");
      return;
    }

    setChargement(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });

    if (error) {
      setTypeMessage("erreur");
      setMessage(
        "Impossible d'envoyer l'e-mail de réinitialisation. Réessayez."
      );
      setChargement(false);
      return;
    }

    setTypeMessage("succes");
    setMessage(
      "Un e-mail de réinitialisation vient de vous être envoyé. Vérifiez également vos courriers indésirables."
    );
    setChargement(false);
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
            autoComplete="email"
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
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-[#DDE5D8] px-4 py-4 outline-none"
          />

          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={motDePasseOublie}
              disabled={chargement}
              className="text-sm font-medium text-[#5BA651]"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {message && (
            <p
              className={`mt-4 text-sm ${
                typeMessage === "succes"
                  ? "text-[#5BA651]"
                  : "text-red-600"
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
            {chargement ? "Veuillez patienter..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ? Nous créerons l'inscription ensuite.
        </p>
      </div>
    </main>
  );
}