"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrickWall,
  CloudRain,
  CloudSun,
  House,
  Leaf,
  Layers3,
  Sun,
  Cloudy,
  CircleHelp,
  MapPinned,
  Pencil,
  Settings,
  Trash2,
  Trees,
  Wind,
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

type ExpositionPluie =
  | "ciel_ouvert"
  | "partiellement_couvert"
  | "sous_toit";

type ExpositionVent =
  | "expose"
  | "partiellement_abrite"
  | "abrite"
  | null;

type TypeSol =
  | "leger"
  | "normal"
  | "lourd"
  | "substrat"
  | "inconnu"
  | null;

type ExpositionSoleil =
  | "plein_soleil"
  | "mi_ombre"
  | "ombre"
  | "inconnu"
  | null;

type Massif = {
  id: number;
  nom: string;
  exposition_pluie: ExpositionPluie;
  exposition_vent: ExpositionVent;
  type_sol: TypeSol;
  exposition_soleil: ExpositionSoleil;
};

export default function MesPlantesPage() {
  const [plantes, setPlantes] = useState<Plante[]>([]);
  const [massifsDb, setMassifsDb] = useState<Massif[]>([]);
  const [chargement, setChargement] = useState(true);

  const [onglet, setOnglet] =
    useState<"plantes" | "massifs">("plantes");

  const [massifEnCours, setMassifEnCours] =
    useState<number | null>(null);

  const [menuSiteOuvert, setMenuSiteOuvert] =
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
              "id, nom, exposition_pluie, exposition_vent, type_sol, exposition_soleil"
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
        setPlantes(resultatPlantes.data ?? []);
      }

      if (resultatMassifs.error) {
        console.error(
          "Erreur chargement sites :",
          resultatMassifs.error
        );
      } else {
        setMassifsDb(resultatMassifs.data ?? []);
      }

      setChargement(false);
    }

    chargerDonnees();
  }, []);

  const plantesParMassif = useMemo(() => {
    const groupes: Record<string, Plante[]> = {};

    plantes.forEach((plante) => {
      const nomMassif =
        plante.massif && plante.massif.trim() !== ""
          ? plante.massif.trim()
          : "Sans site";

      if (!groupes[nomMassif]) {
        groupes[nomMassif] = [];
      }

      groupes[nomMassif].push(plante);
    });

    return groupes;
  }, [plantes]);

  async function modifierExpositionPluie(
    massifId: number,
    nouvelleExposition: ExpositionPluie
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massifId);

    const { error } = await supabase
      .from("massifs")
      .update({
        exposition_pluie: nouvelleExposition,
      })
      .eq("id", massifId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur modification exposition à la pluie :",
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
              exposition_pluie: nouvelleExposition,
            }
          : massif
      )
    );

    setMassifEnCours(null);
  }

  async function modifierExpositionVent(
    massifId: number,
    nouvelleExposition:
      | "expose"
      | "partiellement_abrite"
      | "abrite"
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massifId);

    const { error } = await supabase
      .from("massifs")
      .update({
        exposition_vent: nouvelleExposition,
      })
      .eq("id", massifId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur modification exposition au vent :",
        error
      );

      alert(
        "Impossible de modifier l'exposition au vent."
      );

      setMassifEnCours(null);
      return;
    }

    setMassifsDb((actuels) =>
      actuels.map((massif) =>
        massif.id === massifId
          ? {
              ...massif,
              exposition_vent: nouvelleExposition,
            }
          : massif
      )
    );

    setMassifEnCours(null);
  }

  async function modifierTypeSol(
    massifId: number,
    nouveauTypeSol: Exclude<TypeSol, null>
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massifId);

    const { error } = await supabase
      .from("massifs")
      .update({
        type_sol: nouveauTypeSol,
      })
      .eq("id", massifId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur modification du type de sol :",
        error
      );

      alert("Impossible de modifier le type de sol.");
      setMassifEnCours(null);
      return;
    }

    setMassifsDb((actuels) =>
      actuels.map((massif) =>
        massif.id === massifId
          ? {
              ...massif,
              type_sol: nouveauTypeSol,
            }
          : massif
      )
    );

    setMassifEnCours(null);
  }

  async function modifierExpositionSoleil(
    massifId: number,
    nouvelleExposition: Exclude<ExpositionSoleil, null>
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massifId);

    const { error } = await supabase
      .from("massifs")
      .update({
        exposition_soleil: nouvelleExposition,
      })
      .eq("id", massifId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur modification exposition au soleil :",
        error
      );

      alert(
        "Impossible de modifier l'exposition au soleil."
      );

      setMassifEnCours(null);
      return;
    }

    setMassifsDb((actuels) =>
      actuels.map((massif) =>
        massif.id === massifId
          ? {
              ...massif,
              exposition_soleil: nouvelleExposition,
            }
          : massif
      )
    );

    setMassifEnCours(null);
  }

  async function renommerSite(massif: Massif) {
    const nouveauNom = window.prompt(
      "Nouveau nom du site :",
      massif.nom
    );

    if (nouveauNom === null) {
      setMenuSiteOuvert(null);
      return;
    }

    const nomNettoye = nouveauNom.trim();

    if (!nomNettoye) {
      alert("Le nom du site ne peut pas être vide.");
      return;
    }

    if (nomNettoye === massif.nom) {
      setMenuSiteOuvert(null);
      return;
    }

    if (nomNettoye.toLowerCase() === "sans site") {
      alert('Le nom "Sans site" est réservé.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massif.id);

    const siteExiste = massifsDb.some(
      (site) =>
        site.id !== massif.id &&
        site.nom.trim().toLowerCase() ===
          nomNettoye.toLowerCase()
    );

    if (siteExiste) {
      alert("Un site porte déjà ce nom.");
      setMassifEnCours(null);
      return;
    }

    const { error: erreurPlantes } = await supabase
      .from("plantes")
      .update({ massif: nomNettoye })
      .eq("user_id", user.id)
      .eq("massif", massif.nom);

    if (erreurPlantes) {
      console.error(
        "Erreur renommage du site dans les plantes :",
        erreurPlantes
      );
      alert("Impossible de renommer le site.");
      setMassifEnCours(null);
      return;
    }

    const { error: erreurSite } = await supabase
      .from("massifs")
      .update({ nom: nomNettoye })
      .eq("id", massif.id)
      .eq("user_id", user.id);

    if (erreurSite) {
      console.error(
        "Erreur renommage du site :",
        erreurSite
      );

      await supabase
        .from("plantes")
        .update({ massif: massif.nom })
        .eq("user_id", user.id)
        .eq("massif", nomNettoye);

      alert("Impossible de renommer le site.");
      setMassifEnCours(null);
      return;
    }

    setPlantes((actuelles) =>
      actuelles.map((plante) =>
        plante.massif === massif.nom
          ? { ...plante, massif: nomNettoye }
          : plante
      )
    );

    setMassifsDb((actuels) =>
      actuels.map((site) =>
        site.id === massif.id
          ? { ...site, nom: nomNettoye }
          : site
      )
    );

    setMenuSiteOuvert(null);
    setMassifEnCours(null);
  }

  async function supprimerSite(
    massif: Massif,
    nombrePlantes: number
  ) {
    if (nombrePlantes > 0) {
      alert(
        `Ce site contient encore ${nombrePlantes} plante${
          nombrePlantes > 1 ? "s" : ""
        }. Déplacez-${
          nombrePlantes > 1 ? "les" : "la"
        } vers un autre site avant de le supprimer.`
      );
      setMenuSiteOuvert(null);
      return;
    }

    const confirmation = window.confirm(
      `Supprimer définitivement le site "${massif.nom}" ?`
    );

    if (!confirmation) {
      setMenuSiteOuvert(null);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setMassifEnCours(massif.id);

    const { error } = await supabase
      .from("massifs")
      .delete()
      .eq("id", massif.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Erreur suppression du site :",
        error
      );
      alert("Impossible de supprimer le site.");
      setMassifEnCours(null);
      return;
    }

    setMassifsDb((actuels) =>
      actuels.filter((site) => site.id !== massif.id)
    );

    setMenuSiteOuvert(null);
    setMassifEnCours(null);
  }

  function texteExposition(
    exposition: ExpositionPluie
  ) {
    if (exposition === "partiellement_couvert") {
      return "Partiellement couvert";
    }

    if (exposition === "sous_toit") {
      return "Sous toit";
    }

    return "À ciel ouvert";
  }

  function iconeExposition(
    exposition: ExpositionPluie
  ) {
    if (exposition === "sous_toit") {
      return (
        <House
          size={18}
          className="text-[#E07A5F]"
        />
      );
    }

    if (exposition === "partiellement_couvert") {
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

  function texteVent(
    exposition: ExpositionVent
  ) {
    if (exposition === "expose") {
      return "Exposé au vent";
    }

    if (exposition === "partiellement_abrite") {
      return "Partiellement abrité";
    }

    if (exposition === "abrite") {
      return "À l'abri";
    }

    return "À renseigner";
  }

  function iconeVent(
    exposition: ExpositionVent
  ) {
    if (exposition === "abrite") {
      return (
        <BrickWall
          size={18}
          className="text-[#E07A5F]"
        />
      );
    }

    if (exposition === "partiellement_abrite") {
      return (
        <Trees
          size={18}
          className="text-[#5BA651]"
        />
      );
    }

    return (
      <Wind
        size={18}
        className={
          exposition === "expose"
            ? "text-[#1B4332]"
            : "text-gray-400"
        }
      />
    );
  }

  function texteTypeSol(typeSol: TypeSol) {
    if (typeSol === "leger") {
      return "Très léger / sableux";
    }

    if (typeSol === "normal") {
      return "Normal / équilibré";
    }

    if (typeSol === "lourd") {
      return "Lourd / argileux";
    }

    if (typeSol === "substrat") {
      return "Terreau / substrat";
    }

    if (typeSol === "inconnu") {
      return "Je ne sais pas";
    }

    return "À renseigner";
  }

  function texteExpositionSoleil(
    exposition: ExpositionSoleil
  ) {
    if (exposition === "plein_soleil") {
      return "Plein soleil";
    }

    if (exposition === "mi_ombre") {
      return "Mi-ombre";
    }

    if (exposition === "ombre") {
      return "Ombre";
    }

    if (exposition === "inconnu") {
      return "Je ne sais pas";
    }

    return "À renseigner";
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
            {plantes.length > 1 ? "s" : ""} enregistrée
            {plantes.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="mt-7 flex rounded-3xl bg-[#E8EFD9] p-1">
          <button
            type="button"
            onClick={() => setOnglet("plantes")}
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
            onClick={() => setOnglet("massifs")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
              onglet === "massifs"
                ? "bg-[#1B4332] text-white shadow-sm"
                : "text-[#62705F]"
            }`}
          >
            <MapPinned size={18} />
            Sites
          </button>
        </div>

        {chargement && (
          <p className="mt-8 text-gray-500">
            Chargement...
          </p>
        )}

        {!chargement && plantes.length === 0 && (
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
              Ajoutez votre première plante pour commencer
              votre jardin.
            </p>
          </div>
        )}

        {!chargement && onglet === "plantes" && (
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
                        src={plante.photo_url}
                        alt={plante.nom_commun}
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
                      {plante.massif || "Sans site"}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {plante.nom_commun}
                    </h2>

                    <p className="mt-1 truncate text-sm italic text-gray-500">
                      {plante.nom_botanique}
                    </p>

                    <p className="mt-3 text-xs text-gray-400">
                      Confiance : {plante.confiance}
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

        {!chargement && onglet === "massifs" && (
          <div className="mt-7 space-y-5">
            {massifsDb.map((massif) => {
              const plantesDuMassif =
                plantesParMassif[massif.nom] ?? [];

              return (
                <section
                  key={massif.id}
                  className="rounded-[28px] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#5BA651]">
                        Site
                      </p>

                      <h2 className="mt-1 text-2xl font-semibold">
                        {massif.nom}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {plantesDuMassif.length} plante
                        {plantesDuMassif.length > 1
                          ? "s"
                          : ""}
                      </p>
                    </div>

                    {/* ROUE DE RÉGLAGES DU SITE */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuSiteOuvert((actuel) =>
                            actuel === massif.id
                              ? null
                              : massif.id
                          )
                        }
                        aria-label={`Réglages du site ${massif.nom}`}
                        title="Réglages du site"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF5E9] text-[#1B4332] transition active:scale-95"
                      >
                        <Settings size={21} />
                      </button>

                      {menuSiteOuvert === massif.id && (
                        <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-[#E2E8DD] bg-white p-1 shadow-lg">
                          <button
                            type="button"
                            disabled={massifEnCours === massif.id}
                            onClick={() => renommerSite(massif)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[#1B4332] transition hover:bg-[#F7F5EE] disabled:opacity-50"
                          >
                            <Pencil size={16} />
                            Renommer le site
                          </button>

                          <button
                            type="button"
                            disabled={massifEnCours === massif.id}
                            onClick={() =>
                              supprimerSite(
                                massif,
                                plantesDuMassif.length
                              )
                            }
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[#C65D48] transition hover:bg-[#F7F5EE] disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Supprimer le site
                          </button>
                        </div>
                      )}
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
                          massifEnCours === massif.id
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
                          massifEnCours === massif.id
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
                          massifEnCours === massif.id
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

                  {/* EXPOSITION AU VENT */}
                  <div className="mt-4 rounded-2xl bg-[#F7F5EE] p-4">
                    <div className="flex items-center gap-2">
                      {iconeVent(
                        massif.exposition_vent
                      )}

                      <div>
                        <p className="text-xs text-gray-500">
                          Exposition au vent
                        </p>

                        <p className="mt-0.5 text-sm font-semibold">
                          {texteVent(
                            massif.exposition_vent
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={
                          massifEnCours === massif.id
                        }
                        onClick={() =>
                          modifierExpositionVent(
                            massif.id,
                            "expose"
                          )
                        }
                        className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                          massif.exposition_vent ===
                          "expose"
                            ? "bg-[#1B4332] text-white"
                            : "bg-white text-[#1B4332]"
                        }`}
                      >
                        Exposé
                      </button>

                      <button
                        type="button"
                        disabled={
                          massifEnCours === massif.id
                        }
                        onClick={() =>
                          modifierExpositionVent(
                            massif.id,
                            "partiellement_abrite"
                          )
                        }
                        className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                          massif.exposition_vent ===
                          "partiellement_abrite"
                            ? "bg-[#1B4332] text-white"
                            : "bg-white text-[#1B4332]"
                        }`}
                      >
                        Partiel
                      </button>

                      <button
                        type="button"
                        disabled={
                          massifEnCours === massif.id
                        }
                        onClick={() =>
                          modifierExpositionVent(
                            massif.id,
                            "abrite"
                          )
                        }
                        className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                          massif.exposition_vent ===
                          "abrite"
                            ? "bg-[#1B4332] text-white"
                            : "bg-white text-[#1B4332]"
                        }`}
                      >
                        À l&apos;abri
                      </button>
                    </div>
                  </div>

                  {/* TYPE DE SOL */}
                  <div className="mt-4 rounded-2xl bg-[#F7F5EE] p-4">
                    <div className="flex items-center gap-2">
                      <Layers3
                        size={18}
                        className="text-[#5BA651]"
                      />

                      <div>
                        <p className="text-xs text-gray-500">
                          Type de sol
                        </p>

                        <p className="mt-0.5 text-sm font-semibold">
                          {texteTypeSol(massif.type_sol)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        {
                          valeur: "leger" as const,
                          titre: "Très léger / sableux",
                        },
                        {
                          valeur: "normal" as const,
                          titre: "Normal / équilibré",
                        },
                        {
                          valeur: "lourd" as const,
                          titre: "Lourd / argileux",
                        },
                        {
                          valeur: "substrat" as const,
                          titre: "Terreau / substrat",
                        },
                        {
                          valeur: "inconnu" as const,
                          titre: "Je ne sais pas",
                        },
                      ].map((option) => (
                        <button
                          key={option.valeur}
                          type="button"
                          disabled={massifEnCours === massif.id}
                          onClick={() =>
                            modifierTypeSol(
                              massif.id,
                              option.valeur
                            )
                          }
                          className={`w-full rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
                            massif.type_sol === option.valeur
                              ? "bg-[#1B4332] text-white"
                              : "bg-white text-[#1B4332]"
                          } disabled:opacity-50`}
                        >
                          {option.titre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* EXPOSITION AU SOLEIL */}
                  <div className="mt-4 rounded-2xl bg-[#F7F5EE] p-4">
                    <div className="flex items-center gap-2">
                      <Sun
                        size={18}
                        className="text-[#5BA651]"
                      />

                      <div>
                        <p className="text-xs text-gray-500">
                          Exposition au soleil
                        </p>

                        <p className="mt-0.5 text-sm font-semibold">
                          {texteExpositionSoleil(
                            massif.exposition_soleil
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        {
                          valeur: "plein_soleil" as const,
                          titre: "Plein soleil",
                          detail:
                            "6 h ou plus de soleil direct par jour",
                          Icone: Sun,
                        },
                        {
                          valeur: "mi_ombre" as const,
                          titre: "Mi-ombre",
                          detail:
                            "Environ 3 à 6 h de soleil direct par jour",
                          Icone: CloudSun,
                        },
                        {
                          valeur: "ombre" as const,
                          titre: "Ombre",
                          detail:
                            "Moins de 3 h de soleil direct par jour",
                          Icone: Cloudy,
                        },
                        {
                          valeur: "inconnu" as const,
                          titre: "Je ne sais pas",
                          detail:
                            "Feuillia utilisera une estimation prudente",
                          Icone: CircleHelp,
                        },
                      ].map((option) => {
                        const Icone = option.Icone;

                        return (
                          <button
                            key={option.valeur}
                            type="button"
                            disabled={
                              massifEnCours === massif.id
                            }
                            onClick={() =>
                              modifierExpositionSoleil(
                                massif.id,
                                option.valeur
                              )
                            }
                            className={`rounded-xl px-3 py-3 text-left transition ${
                              massif.exposition_soleil ===
                              option.valeur
                                ? "bg-[#1B4332] text-white"
                                : "bg-white text-[#1B4332]"
                            } disabled:opacity-50`}
                          >
                            <Icone
                              size={17}
                              className="mb-2"
                            />

                            <span className="block text-xs font-semibold">
                              {option.titre}
                            </span>

                            <span
                              className={`mt-1 block text-[10px] font-normal leading-4 ${
                                massif.exposition_soleil ===
                                option.valeur
                                  ? "text-white/80"
                                  : "text-gray-500"
                              }`}
                            >
                              {option.detail}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PLANTES DU SITE */}
                  {plantesDuMassif.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {plantesDuMassif.map((plante) => (
                        <a
                          key={plante.id}
                          href={`/plante/${plante.id}`}
                          className="rounded-2xl bg-[#F7F5EE] p-4"
                        >
                          <p className="text-sm font-semibold">
                            {plante.nom_commun}
                          </p>

                          <p className="mt-1 truncate text-xs italic text-gray-500">
                            {plante.nom_botanique}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <BoutonAjouter />
      </div>
    </main>
  );
}