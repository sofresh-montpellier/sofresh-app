"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Droplets,
  FlaskConical,
  History,
  Scissors,
  Sprout,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Plante = {
  id: number;
  nom_commun: string;
  nom_botanique: string | null;
  photo_url: string | null;
};

type TacheHistorique = {
  id: number;
  type_tache: string;
  titre: string | null;
  detail: string | null;
  date_effectuee: string;
};

function formaterDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function informationsTache(type: string) {
  switch (type) {
    case "arrosage":
      return {
        libelle: "Arrosage",
        icone: Droplets,
        fond: "bg-[#EAF4F7]",
        couleur: "text-[#3C91A6]",
      };

    case "verification_arrosage":
      return {
        libelle: "Contrôle de l'humidité",
        icone: Droplets,
        fond: "bg-[#EEF5E9]",
        couleur: "text-[#5BA651]",
      };

    case "fertilisation":
      return {
        libelle: "Fertilisation",
        icone: FlaskConical,
        fond: "bg-[#FFF5D6]",
        couleur: "text-[#D6A817]",
      };

    case "taille":
      return {
        libelle: "Taille",
        icone: Scissors,
        fond: "bg-[#FBE7DF]",
        couleur: "text-[#E07A5F]",
      };

    default:
      return {
        libelle: "Entretien",
        icone: Sprout,
        fond: "bg-[#EEF5E9]",
        couleur: "text-[#5BA651]",
      };
  }
}

export default function HistoriquePlantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [idPlante, setIdPlante] = useState<string | null>(null);
  const [plante, setPlante] = useState<Plante | null>(null);
  const [historique, setHistorique] = useState<TacheHistorique[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function recupererId() {
      const resultat = await params;
      setIdPlante(resultat.id);
    }

    recupererId();
  }, [params]);

  useEffect(() => {
    if (!idPlante) return;

    async function chargerHistorique() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const { data: planteData, error: erreurPlante } = await supabase
        .from("plantes")
        .select("id, nom_commun, nom_botanique, photo_url")
        .eq("id", Number(idPlante))
        .eq("user_id", user.id)
        .single();

      if (erreurPlante || !planteData) {
        console.error("Erreur chargement plante :", erreurPlante);
        setChargement(false);
        return;
      }

      setPlante(planteData as Plante);

      const { data: tachesData, error: erreurTaches } = await supabase
        .from("taches")
        .select("id, type_tache, titre, detail, date_effectuee")
        .eq("plante_id", Number(idPlante))
        .eq("user_id", user.id)
        .eq("terminee", true)
        .not("date_effectuee", "is", null)
        .order("date_effectuee", { ascending: false });

      if (erreurTaches) {
        console.error("Erreur chargement historique :", erreurTaches);
      } else {
        setHistorique((tachesData || []) as TacheHistorique[]);
      }

      setChargement(false);
    }

    chargerHistorique();
  }, [idPlante]);

  if (chargement) {
    return (
      <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
        <div className="mx-auto max-w-md px-5 py-6">
          <p className="text-sm text-gray-500">Chargement...</p>
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
        <div className="flex items-center gap-4">
          <a
            href={`/plante/${plante.id}`}
            aria-label="Retour à la plante"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
          >
            <ArrowLeft size={19} />
          </a>

          <div>
            <p className="text-xs font-medium text-[#5BA651]">
              {plante.nom_commun}
            </p>

            <h1 className="text-2xl font-semibold">
              Historique
            </h1>
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-[26px] bg-[#1B4332] p-5 text-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <History size={24} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Suivi des entretiens
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#DDEBDD]">
                Les soins réellement effectués sur cette plante.
              </p>
            </div>
          </div>
        </section>

        {historique.length === 0 ? (
          <section className="mt-5 rounded-[24px] bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5E9]">
              <CalendarDays
                size={23}
                className="text-[#5BA651]"
              />
            </div>

            <h2 className="mt-4 text-base font-semibold">
              Aucun entretien enregistré
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Les arrosages, tailles et fertilisations effectués apparaîtront
              ici au fur et à mesure.
            </p>
          </section>
        ) : (
          <section className="mt-5">
            <div className="space-y-3">
              {historique.map((tache) => {
                const infos = informationsTache(tache.type_tache);
                const Icone = infos.icone;

                return (
                  <article
                    key={tache.id}
                    className="rounded-[22px] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${infos.fond}`}
                      >
                        <Icone
                          size={20}
                          className={infos.couleur}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-[#5BA651]">
                              {infos.libelle}
                            </p>

                            <h3 className="mt-1 text-sm font-semibold text-[#1B4332]">
                              {tache.titre || infos.libelle}
                            </h3>
                          </div>

                          <p className="shrink-0 text-[11px] text-gray-400">
                            {formaterDate(tache.date_effectuee)}
                          </p>
                        </div>

                        {tache.detail && (
                          <p className="mt-2 text-sm leading-5 text-gray-600">
                            {tache.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}