"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Crown,
  Leaf,
  Loader2,
  Sparkles,
} from "lucide-react";

type Offre =
  | "jardinier_mensuel"
  | "jardinier_annuel"
  | "expert_mensuel"
  | "expert_annuel";

export default function AbonnementPage() {
  const [periode, setPeriode] = useState<"mensuel" | "annuel">(
    "mensuel"
  );

  const [chargement, setChargement] = useState<Offre | null>(
    null
  );

  const [erreur, setErreur] = useState("");

  async function sabonner(offre: Offre) {
    setChargement(offre);
    setErreur("");

    try {
      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ offre }),
        }
      );

      const resultat = await response.json();

      if (!response.ok || !resultat.url) {
        throw new Error(
          resultat.error ||
            "Impossible de démarrer l'abonnement."
        );
      }

      window.location.href = resultat.url;
    } catch (error) {
      console.error("Erreur abonnement :", error);

      setErreur(
        "Impossible d'ouvrir le paiement. Réessayez."
      );

      setChargement(null);
    }
  }

  const offreJardinier: Offre =
    periode === "mensuel"
      ? "jardinier_mensuel"
      : "jardinier_annuel";

  const offreExpert: Offre =
    periode === "mensuel"
      ? "expert_mensuel"
      : "expert_annuel";

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-6">
        <div className="flex items-center">
          <a
            href="/profil"
            aria-label="Retour au profil"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
          >
            <ArrowLeft size={20} />
          </a>
        </div>

        <div className="mt-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4E5]">
            <Leaf
              size={28}
              className="text-[#5BA651]"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-[#5BA651]">
            Feuillia
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Choisissez votre formule
          </h1>

          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-gray-500">
            Des conseils adaptés à votre jardin et à votre
            niveau.
          </p>
        </div>

        <div className="mt-7 flex rounded-2xl bg-[#EAE8E0] p-1">
          <button
            type="button"
            onClick={() => setPeriode("mensuel")}
            className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              periode === "mensuel"
                ? "bg-white text-[#1B4332] shadow-sm"
                : "text-gray-500"
            }`}
          >
            Mensuel
          </button>

          <button
            type="button"
            onClick={() => setPeriode("annuel")}
            className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              periode === "annuel"
                ? "bg-white text-[#1B4332] shadow-sm"
                : "text-gray-500"
            }`}
          >
            Annuel
            <span className="ml-2 rounded-full bg-[#DFF1D7] px-2 py-1 text-[10px] text-[#397A32]">
              Économisez
            </span>
          </button>
        </div>

        {/* GRATUIT */}

        <section className="mt-6 rounded-3xl border border-[#E3E5DE] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F5EE]">
              <Leaf size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Feuillia Gratuit
              </h2>

              <p className="text-sm text-gray-500">
                Pour découvrir Feuillia
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-1">
            <span className="text-3xl font-bold">0 €</span>
            <span className="pb-1 text-sm text-gray-500">
              / toujours
            </span>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <Avantage texte="Gestion de vos plantes" />
            <Avantage texte="Conseils essentiels" />
            <Avantage texte="Suivi simple du jardin" />
          </div>

          <div className="mt-5 rounded-2xl bg-[#F7F5EE] py-3 text-center text-sm font-semibold text-gray-500">
            Votre formule actuelle
          </div>
        </section>

        {/* JARDINIER */}

        <section className="mt-5 rounded-3xl border-2 border-[#8BC77E] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF4E5]">
                <Sparkles
                  size={21}
                  className="text-[#5BA651]"
                />
              </div>

              <div>
                <h2 className="text-lg font-bold">
                  Feuillia Jardinier
                </h2>

                <p className="text-sm text-gray-500">
                  Pour entretenir facilement
                </p>
              </div>
            </div>

            <span className="rounded-full bg-[#EAF4E5] px-3 py-1 text-[11px] font-bold text-[#397A32]">
              CONSEILLÉ
            </span>
          </div>

          <div className="mt-5 flex items-end gap-1">
            <span className="text-3xl font-bold">
              {periode === "mensuel"
                ? "3,99 €"
                : "39,90 €"}
            </span>

            <span className="pb-1 text-sm text-gray-500">
              {periode === "mensuel" ? "/ mois" : "/ an"}
            </span>
          </div>

          {periode === "annuel" && (
            <p className="mt-1 text-xs font-medium text-[#5BA651]">
              Soit environ 3,33 € / mois
            </p>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <Avantage texte="Conseils personnalisés" />
            <Avantage texte="Suivi complet de vos plantes" />
            <Avantage texte="Calendrier des tâches" />
            <Avantage texte="Astuces de Mamie" />
            <Avantage texte="Conseils adaptés à la météo" />
          </div>

          <button
            type="button"
            onClick={() => sabonner(offreJardinier)}
            disabled={chargement !== null}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5BA651] py-4 font-bold text-white disabled:opacity-60"
          >
            {chargement === offreJardinier ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Ouverture...
              </>
            ) : (
              "Choisir Jardinier"
            )}
          </button>
        </section>

        {/* EXPERT */}

        <section className="relative mt-5 overflow-hidden rounded-3xl bg-[#173E2D] p-5 text-white shadow-sm">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Crown
                size={22}
                className="text-[#D9E9A6]"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Feuillia Expert
              </h2>

              <p className="text-sm text-white/70">
                Pour aller plus loin
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex items-end gap-1">
            <span className="text-3xl font-bold">
              {periode === "mensuel"
                ? "5,99 €"
                : "59,90 €"}
            </span>

            <span className="pb-1 text-sm text-white/70">
              {periode === "mensuel" ? "/ mois" : "/ an"}
            </span>
          </div>

          {periode === "annuel" && (
            <p className="relative mt-1 text-xs font-medium text-[#D9E9A6]">
              Soit environ 4,99 € / mois
            </p>
          )}

          <div className="relative mt-5 space-y-3 text-sm">
            <AvantageSombre texte="Tout Feuillia Jardinier" />
            <AvantageSombre texte="Conseils avancés et personnalisés" />
            <AvantageSombre texte="Permaculture" />
            <AvantageSombre texte="Optimisation du jardin" />
            <AvantageSombre texte="Optimisation des jardinières" />
            <AvantageSombre texte="Fonctionnalités expertes" />
          </div>

          <button
            type="button"
            onClick={() => sabonner(offreExpert)}
            disabled={chargement !== null}
            className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-[#173E2D] disabled:opacity-60"
          >
            {chargement === offreExpert ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Ouverture...
              </>
            ) : (
              "Choisir Expert"
            )}
          </button>
        </section>

        {erreur && (
          <p className="mt-5 text-center text-sm font-medium text-red-600">
            {erreur}
          </p>
        )}

        <p className="mt-7 text-center text-xs leading-5 text-gray-400">
          Paiement sécurisé. Vous pourrez gérer votre
          abonnement depuis votre compte.
        </p>
      </div>
    </main>
  );
}

function Avantage({ texte }: { texte: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF4E5]">
        <Check
          size={13}
          strokeWidth={3}
          className="text-[#5BA651]"
        />
      </div>

      <span>{texte}</span>
    </div>
  );
}

function AvantageSombre({ texte }: { texte: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Check
          size={13}
          strokeWidth={3}
          className="text-[#D9E9A6]"
        />
      </div>

      <span>{texte}</span>
    </div>
  );
}