"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Droplets,
  MapPinned,
  Scissors,
  ShieldAlert,
  Sprout,
  Sun,
  Thermometer,
  TreePine,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Plante = {
  id: number;
  nom_commun: string;
  nom_botanique: string;
  confiance: string;
  photo_url: string | null;
  massif: string | null;

  arrosage: string | null;
  lumiere: string | null;
  temperature: string | null;

  periode_taille: string | null;
  pourquoi_taille: string | null;
  comment_tailler: string | null;
  intensite_taille: string | null;
  precautions_taille: string | null;

  conseil_entretien: string | null;
};

function ResumeConseil({
  texte,
}: {
  texte: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);

  if (!texte) {
    return (
      <p className="mt-1 text-sm font-medium text-gray-700">
        Conseil non disponible
      </p>
    );
  }

  const limite = 150;
  const estLong = texte.length > limite;

  const resume =
    estLong && !ouvert
      ? texte.slice(0, limite).trim() + "..."
      : texte;

  return (
    <div>
      <p className="mt-1 text-sm leading-5 text-gray-700">
        {resume}
      </p>

      {estLong && (
        <button
          type="button"
          onClick={() => setOuvert(!ouvert)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5BA651]"
        >
          {ouvert ? (
            <>
              Voir moins
              <ChevronUp size={15} />
            </>
          ) : (
            <>
              Voir le détail
              <ChevronDown size={15} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function FichePlantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [plante, setPlante] =
    useState<Plante | null>(null);

  const [chargement, setChargement] =
    useState(true);

  const [idPlante, setIdPlante] =
    useState<string | null>(null);

  useEffect(() => {
    async function recupererId() {
      const resultat = await params;
      setIdPlante(resultat.id);
    }

    recupererId();
  }, [params]);

  useEffect(() => {
    if (!idPlante) return;

    async function chargerPlante() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const { data, error } = await supabase
        .from("plantes")
        .select("*")
        .eq("id", idPlante)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(
          "Erreur chargement plante :",
          error
        );

        setChargement(false);
        return;
      }

      setPlante(data);
      setChargement(false);
    }

    chargerPlante();
  }, [idPlante]);

  if (chargement) {
    return (
      <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
        <div className="mx-auto max-w-md px-5 py-6">
          <p className="text-gray-500">
            Chargement...
          </p>
        </div>
      </main>
    );
  }

  if (!plante) {
    return (
      <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
        <div className="mx-auto max-w-md px-5 py-6">
          <a
            href="/mes-plantes"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
          >
            <ArrowLeft size={20} />
          </a>

          <p className="mt-8 text-gray-500">
            Cette plante est introuvable.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-5">

        {/* RETOUR */}
        <a
          href="/mes-plantes"
          aria-label="Retour"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          <ArrowLeft size={19} />
        </a>

        {/* PHOTO */}
        <section className="mt-4 overflow-hidden rounded-[26px] bg-white shadow-sm">
          <div className="flex h-44 items-center justify-center bg-[#EEF5E9]">
            {plante.photo_url ? (
              <img
                src={plante.photo_url}
                alt={plante.nom_commun}
                className="h-full w-full object-cover"
              />
            ) : (
              <Sprout
                size={54}
                className="text-[#5BA651]"
              />
            )}
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium text-[#5BA651]">
              {plante.massif || "Sans massif"}
            </p>

            <h1 className="mt-1 text-2xl font-semibold leading-tight">
              {plante.nom_commun}
            </h1>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-sm italic text-gray-500">
                {plante.nom_botanique}
              </p>

              <p className="shrink-0 text-[11px] text-gray-400">
                ID : {plante.confiance}
              </p>
            </div>
          </div>
        </section>

        {/* BESOINS */}
        <section className="mt-5">
          <h2 className="text-lg font-semibold">
            Besoins de la plante
          </h2>

          <div className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-sm">

            {/* ARROSAGE */}
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5E9]">
                <Droplets
                  size={19}
                  className="text-[#5BA651]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Arrosage
                </p>

                <ResumeConseil
                  texte={plante.arrosage}
                />
              </div>
            </div>

            <div className="mx-4 h-px bg-[#EDF0E9]" />

            {/* LUMIERE */}
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF5D6]">
                <Sun
                  size={19}
                  className="text-[#D6A817]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Lumière
                </p>

                <ResumeConseil
                  texte={plante.lumiere}
                />
              </div>
            </div>

            <div className="mx-4 h-px bg-[#EDF0E9]" />

            {/* EMPLACEMENT */}
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5E9]">
                <MapPinned
                  size={19}
                  className="text-[#5BA651]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Emplacement
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {plante.massif ||
                    "Non défini"}
                </p>
              </div>
            </div>

            <div className="mx-4 h-px bg-[#EDF0E9]" />

            {/* TEMPERATURE */}
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBE7DF]">
                <Thermometer
                  size={19}
                  className="text-[#E07A5F]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Température
                </p>

                <ResumeConseil
                  texte={plante.temperature}
                />
              </div>
            </div>
          </div>
        </section>

        {/* TAILLE */}
        <section className="mt-5 overflow-hidden rounded-[26px] bg-white shadow-sm">

          <div className="bg-[#1B4332] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Scissors size={21} />
              </div>

              <div>
                <p className="text-xs text-[#A7D08C]">
                  Guide pratique
                </p>

                <h2 className="text-xl font-semibold">
                  Taille & entretien
                </h2>
              </div>
            </div>
          </div>

          <div className="p-5">

            {/* PERIODE */}
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5D6]">
                <CalendarDays
                  size={20}
                  className="text-[#D6A817]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Période idéale
                </p>

                <p className="mt-1 text-sm font-semibold leading-5">
                  {plante.periode_taille ||
                    "Conseil non disponible"}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-[#EDF0E9]" />

            {/* POURQUOI */}
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5D6]">
                <CircleHelp
                  size={20}
                  className="text-[#D6A817]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Pourquoi cette période ?
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {plante.pourquoi_taille ||
                    "Conseil non disponible"}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-[#EDF0E9]" />

            {/* COMMENT */}
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5E9]">
                <Scissors
                  size={20}
                  className="text-[#5BA651]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Comment tailler ?
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {plante.comment_tailler ||
                    "Conseil non disponible"}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-[#EDF0E9]" />

            {/* INTENSITE */}
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5E9]">
                <TreePine
                  size={20}
                  className="text-[#5BA651]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  Intensité
                </p>

                <p className="mt-1 text-sm font-semibold leading-5">
                  {plante.intensite_taille ||
                    "Conseil non disponible"}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-[#EDF0E9]" />

            {/* PRECAUTIONS */}
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBE7DF]">
                <ShieldAlert
                  size={20}
                  className="text-[#E07A5F]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  À ne surtout pas faire
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {plante.precautions_taille ||
                    "Conseil non disponible"}
                </p>
              </div>
            </div>

            {/* CONSEIL FEUILLIA */}
            <div className="mt-5 rounded-2xl bg-[#F7F5EE] p-4">
              <p className="text-sm font-semibold text-[#5BA651]">
                Conseil Feuillia
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                {plante.conseil_entretien ||
                  "Conseil non disponible"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}