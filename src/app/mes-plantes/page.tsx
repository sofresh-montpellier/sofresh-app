"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  CloudSun,
  House,
  Leaf,
  MapPinned,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import BoutonAjouter from "../ajouter-massif/components/BoutonAjouter";

type Plante = {
  id: number;
  nom_commun: string;
  nom_botanique: string;
  confiance: string;
  photo_url: string | null;
  massif: string | null;
};

type Massif = {
  id: number;
  nom: string;
  exposition_pluie:
    | "ciel_ouvert"
    | "partiellement_couvert"
    | "sous_toit";
};

export default function MesPlantesPage() {
  const [plantes, setPlantes] = useState<Plante[]>([]);
  const [massifsDb, setMassifsDb] = useState<Massif[]>([]);
  const [chargement, setChargement] = useState(true);

  const [onglet, setOnglet] =
    useState<"plantes" | "massifs">("plantes");

  const [massifEnCours, setMassifEnCours] =
    useState<number | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPlantes([]);
        setMassifsDb([]);
        setChargement(false);
        return;
      }

      const [resultatPlantes, resultatMassifs] =
        await Promise.all([
          supabase
            .from("plantes")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("massifs")
            .select(
              "id, nom, exposition_pluie"
            )
            .eq("user_id", user.id)
            .order("nom", {
              ascending: true,
            }),
        ]);

      if (resultatPlantes.error) {
        console.error(
          "Erreur chargement plantes :",
          resultatPlantes.error
        );
      } else {
        setPlantes(
          resultatPlantes.data ?? []
        );
      }

      if (resultatMassifs.error) {
        console.error(
          "Erreur chargement massifs :",
          resultatMassifs.error
        );
      } else {
        setMassifsDb(
          resultatMassifs.data ?? []
        );
      }

      setChargement(false);
    }

    chargerDonnees();
  }, []);

  const plantesParMassif =
    useMemo(() => {
      const groupes: Record<
        string,
        Plante[]
      > = {};

      plantes.forEach((plante) => {
        const nomMassif =
          plante.massif &&
          plante.massif.trim() !== ""
            ? plante.massif.trim()
            : "Sans massif";

        if (!groupes[nomMassif]) {
          groupes[nomMassif] = [];
        }

        groupes[nomMassif].push(
          plante
        );
      });

      return groupes;
    }, [plantes]);

  async function modifierExpositionPluie(
    massifId: number,
    nouvelleExposition:
      | "ciel_ouvert"
      | "partiellement_couvert"
      | "sous_toit"
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massifId);

    const { error } = await supabase
      .from("massifs")
      .update({
        exposition_pluie:
          nouvelleExposition,
      })
      .eq("id", massifId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur modification massif :",
        error
      );

      alert(
        "Impossible de modifier l'exposition à la pluie."
      );

      setMassifEnCours(null);
      return;
    }

    setMassifsDb((actuels) =>
      actuels.map((massif) =>
        massif.id === massifId
          ? {
              ...massif,
              exposition_pluie:
                nouvelleExposition,
            }
          : massif
      )
    );

    setMassifEnCours(null);
  }

  function texteExposition(
    exposition: Massif["exposition_pluie"]
  ) {
    if (
      exposition ===
      "partiellement_couvert"
    ) {
      return "Partiellement couvert";
    }

    if (exposition === "sous_toit") {
      return "Sous toit";
    }

    return "À ciel ouvert";
  }

  function iconeExposition(
    exposition: Massif["exposition_pluie"]
  ) {
    if (exposition === "sous_toit") {
      return (
        <House
          size={18}
          className="text-[#E07A5F]"
        />
      );
    }

    if (
      exposition ===
      "partiellement_couvert"
    ) {
      return (
        <CloudSun
          size={18}
          className="text-[#D6A817]"
        />
      );
    }

    return (
      <CloudRain
        size={18}
        className="text-[#5BA651]"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-6 py-8">

        <a
          href="/"
          aria-label="Retour"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          ←
        </a>

        <div className="mt-8">
          <p className="text-sm font-medium text-[#5BA651]">
            Mon jardin
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Mes plantes
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {plantes.length} plante
            {plantes.length > 1
              ? "s"
              : ""}{" "}
            enregistrée
            {plantes.length > 1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="mt-7 flex rounded-3xl bg-[#E8EFD9] p-1">
          <button
            type="button"
            onClick={() =>
              setOnglet("plantes")
            }
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
              onglet === "plantes"
                ? "bg-[#1B4332] text-white shadow-sm"
                : "text-[#62705F]"
            }`}
          >
            <Leaf size={18} />
            Plantes
          </button>

          <button
            type="button"
            onClick={() =>
              setOnglet("massifs")
            }
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
              onglet === "massifs"
                ? "bg-[#1B4332] text-white shadow-sm"
                : "text-[#62705F]"
            }`}
          >
            <MapPinned size={18} />
            Massifs
          </button>
        </div>

        {chargement && (
          <p className="mt-8 text-gray-500">
            Chargement...
          </p>
        )}

        {!chargement &&
          plantes.length === 0 && (
            <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF5E9]">
                <Leaf
                  size={30}
                  className="text-[#5BA651]"
                />
              </div>

              <p className="mt-4 font-semibold">
                Aucune plante enregistrée
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Ajoutez votre première
                plante pour commencer
                votre jardin.
              </p>
            </div>
          )}

        {!chargement &&
          onglet === "plantes" && (
            <div className="mt-7 space-y-4">
              {plantes.map((plante) => (
                <a
                  key={plante.id}
                  href={`/plante/${plante.id}`}
                  className="block rounded-3xl bg-white p-5 shadow-sm transition active:scale-[0.99]"
                >
                  <div className="flex items-start gap-4">

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF5E9]">
                      {plante.photo_url ? (
                        <img
                          src={
                            plante.photo_url
                          }
                          alt={
                            plante.nom_commun
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Leaf
                          size={28}
                          className="text-[#5BA651]"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#5BA651]">
                        {plante.massif ||
                          "Sans massif"}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {
                          plante.nom_commun
                        }
                      </h2>

                      <p className="mt-1 truncate text-sm italic text-gray-500">
                        {
                          plante.nom_botanique
                        }
                      </p>

                      <p className="mt-3 text-xs text-gray-400">
                        Confiance :{" "}
                        {
                          plante.confiance
                        }
                      </p>
                    </div>

                    <span className="pt-5 text-xl text-[#8EA18A]">
                      ›
                    </span>

                  </div>
                </a>
              ))}
            </div>
          )}

        {!chargement &&
          onglet === "massifs" && (
            <div className="mt-7 space-y-5">
              {massifsDb.map(
                (massif) => {
                  const plantesDuMassif =
                    plantesParMassif[
                      massif.nom
                    ] ?? [];

                  return (
                    <section
                      key={massif.id}
                      className="rounded-[28px] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">

                        <div>
                          <p className="text-sm font-medium text-[#5BA651]">
                            Site / massif
                          </p>

                          <h2 className="mt-1 text-2xl font-semibold">
                            {massif.nom}
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              plantesDuMassif.length
                            }{" "}
                            plante
                            {plantesDuMassif.length >
                            1
                              ? "s"
                              : ""}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5E9]">
                          <MapPinned
                            size={24}
                            className="text-[#5BA651]"
                          />
                        </div>

                      </div>

                      {/* EXPOSITION À LA PLUIE */}
                      <div className="mt-5 rounded-2xl bg-[#F7F5EE] p-4">

                        <div className="flex items-center gap-2">

                          {iconeExposition(
                            massif.exposition_pluie
                          )}

                          <div>
                            <p className="text-xs text-gray-500">
                              Exposition à la pluie
                            </p>

                            <p className="mt-0.5 text-sm font-semibold">
                              {texteExposition(
                                massif.exposition_pluie
                              )}
                            </p>
                          </div>

                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">

                          <button
                            type="button"
                            disabled={
                              massifEnCours ===
                              massif.id
                            }
                            onClick={() =>
                              modifierExpositionPluie(
                                massif.id,
                                "ciel_ouvert"
                              )
                            }
                            className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                              massif.exposition_pluie ===
                              "ciel_ouvert"
                                ? "bg-[#1B4332] text-white"
                                : "bg-white text-[#1B4332]"
                            }`}
                          >
                            Ciel ouvert
                          </button>

                          <button
                            type="button"
                            disabled={
                              massifEnCours ===
                              massif.id
                            }
                            onClick={() =>
                              modifierExpositionPluie(
                                massif.id,
                                "partiellement_couvert"
                              )
                            }
                            className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                              massif.exposition_pluie ===
                              "partiellement_couvert"
                                ? "bg-[#1B4332] text-white"
                                : "bg-white text-[#1B4332]"
                            }`}
                          >
                            Partiel
                          </button>

                          <button
                            type="button"
                            disabled={
                              massifEnCours ===
                              massif.id
                            }
                            onClick={() =>
                              modifierExpositionPluie(
                                massif.id,
                                "sous_toit"
                              )
                            }
                            className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                              massif.exposition_pluie ===
                              "sous_toit"
                                ? "bg-[#1B4332] text-white"
                                : "bg-white text-[#1B4332]"
                            }`}
                          >
                            Sous toit
                          </button>

                        </div>
                      </div>

                      {/* PLANTES DU MASSIF */}
                      {plantesDuMassif.length >
                        0 && (
                        <div className="mt-5 grid grid-cols-2 gap-3">

                          {plantesDuMassif
                            .slice(0, 4)
                            .map(
                              (plante) => (
                                <a
                                  key={
                                    plante.id
                                  }
                                  href={`/plante/${plante.id}`}
                                  className="rounded-2xl bg-[#F7F5EE] p-4"
                                >
                                  <p className="text-sm font-semibold">
                                    {
                                      plante.nom_commun
                                    }
                                  </p>

                                  <p className="mt-1 truncate text-xs italic text-gray-500">
                                    {
                                      plante.nom_botanique
                                    }
                                  </p>
                                </a>
                              )
                            )}

                        </div>
                      )}
                    </section>
                  );
                }
              )}
            </div>
          )}

        {/* BOUTON + UNIVERSEL */}
        <BoutonAjouter />

      </div>
    </main>
  );
}