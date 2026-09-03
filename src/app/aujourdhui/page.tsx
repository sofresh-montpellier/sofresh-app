"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudRain,
  Droplets,
  MapPin,
  Scissors,
  Sprout,
  ThermometerSun,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import BoutonAjouter from "../ajouter-massif/components/BoutonAjouter";

type ExpositionPluie =
  | "ciel_ouvert"
  | "partiellement_couvert"
  | "sous_toit"
  | null;

type Plante = {
  id: number;
  nom_commun: string;
  photo_url: string | null;
  massif: string | null;
  exposition_pluie?: ExpositionPluie;
};

type Tache = {
  id: number;
  plante_id: number;
  type_tache: string;
  titre: string;
  detail: string | null;
  date_prevue: string;
  plante?: Plante;
};

type Meteo = {
  ville: string;
  temperatureActuelle: number;
  temperatureMax: number;
  pluieDernieres24h: number;
  pluieProchaines24h: number;
};

export default function AujourdhuiPage() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [chargement, setChargement] = useState(true);
  const [tachesCochees, setTachesCochees] = useState<number[]>([]);
  const [meteo, setMeteo] = useState<Meteo | null>(null);
  const [chargementMeteo, setChargementMeteo] = useState(true);
  const [erreurMeteo, setErreurMeteo] = useState("");

  useEffect(() => {
    chargerTaches();
    chargerMeteo();
  }, []);

  function dateAujourdhui() {
    return new Date().toLocaleDateString("en-CA");
  }

  function ajouterJours(date: Date, nombreJours: number) {
    const nouvelleDate = new Date(date);

    nouvelleDate.setDate(
      nouvelleDate.getDate() + nombreJours
    );

    return nouvelleDate;
  }

  async function chargerMeteo() {
    setChargementMeteo(true);
    setErreurMeteo("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChargementMeteo(false);
      return;
    }

    const { data: profil, error: erreurProfil } =
      await supabase
        .from("profils")
        .select("ville_jardin, latitude, longitude")
        .eq("user_id", user.id)
        .maybeSingle();

    if (erreurProfil) {
      console.error(
        "Erreur chargement localisation météo :",
        erreurProfil
      );
      setErreurMeteo("Météo indisponible.");
      setChargementMeteo(false);
      return;
    }

    const latitude = Number(profil?.latitude);
    const longitude = Number(profil?.longitude);

    if (
      !profil?.ville_jardin ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setErreurMeteo(
        "Ajoutez la localisation du jardin dans votre profil."
      );
      setChargementMeteo(false);
      return;
    }

    try {
      const response = await fetch("/api/meteo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const donnees = await response.json();

      if (!response.ok) {
        throw new Error(
          donnees?.erreur ||
            "Impossible de récupérer la météo."
        );
      }

      const temperatureActuelle = Number(
        donnees.temperatureActuelle
      );
      const temperatureMax = Number(
        donnees.temperatureMax
      );
      const pluieDernieres24h = Number(
        donnees.pluieDernieres24h
      );
      const pluieProchaines24h = Number(
        donnees.pluieProchaines24h
      );

      if (
        !Number.isFinite(temperatureActuelle) ||
        !Number.isFinite(temperatureMax) ||
        !Number.isFinite(pluieDernieres24h) ||
        !Number.isFinite(pluieProchaines24h)
      ) {
        throw new Error("Données météo incomplètes.");
      }

      setMeteo({
        ville: profil.ville_jardin,
        temperatureActuelle,
        temperatureMax,
        pluieDernieres24h,
        pluieProchaines24h,
      });
    } catch (error) {
      console.error("Erreur météo :", error);
      setErreurMeteo("Impossible de récupérer la météo.");
    }

    setChargementMeteo(false);
  }

  function conseilMeteoArrosage() {
    if (!meteo) {
      return "";
    }

    if (
      meteo.pluieDernieres24h >= 5 ||
      meteo.pluieProchaines24h >= 5
    ) {
      return "Pluie significative : l’arrosage pourra probablement être réduit.";
    }

    if (meteo.temperatureMax >= 30) {
      return "Journée chaude : surveillez particulièrement les plantes en pot.";
    }

    if (
      meteo.pluieDernieres24h > 0 ||
      meteo.pluieProchaines24h > 0
    ) {
      return "Un peu de pluie est observée ou prévue : Feuillia en tiendra bientôt compte.";
    }

    return "Pas de pluie significative sur les dernières et prochaines 24 h.";
  }

  async function chargerTaches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/connexion";
      return;
    }

    const aujourdHui = dateAujourdhui();

    const {
      data: donneesTaches,
      error: erreurTaches,
    } = await supabase
      .from("taches")
      .select(`
        id,
        plante_id,
        type_tache,
        titre,
        detail,
        date_prevue
      `)
      .eq("user_id", user.id)
      .eq("terminee", false)
      .lte("date_prevue", aujourdHui)
      .order("date_prevue", {
        ascending: true,
      });

    if (erreurTaches) {
      console.error(
        "Erreur chargement tâches :",
        erreurTaches
      );

      setChargement(false);
      return;
    }

    if (
      !donneesTaches ||
      donneesTaches.length === 0
    ) {
      setTaches([]);
      setChargement(false);
      return;
    }

    const idsPlantes = Array.from(
      new Set(
        donneesTaches.map(
          (tache) => tache.plante_id
        )
      )
    );

    const {
      data: donneesPlantes,
      error: erreurPlantes,
    } = await supabase
      .from("plantes")
      .select(
        "id, nom_commun, photo_url, massif"
      )
      .in("id", idsPlantes)
      .eq("user_id", user.id);

    if (erreurPlantes) {
      console.error(
        "Erreur chargement plantes :",
        erreurPlantes
      );

      setChargement(false);
      return;
    }

    const { data: donneesMassifs, error: erreurMassifs } =
      await supabase
        .from("massifs")
        .select("nom, exposition_pluie")
        .eq("user_id", user.id);

    if (erreurMassifs) {
      console.error(
        "Erreur chargement exposition des massifs :",
        erreurMassifs
      );
    }

    const expositionParMassif =
      new Map<string, ExpositionPluie>();

    (donneesMassifs ?? []).forEach(
      (massif) => {
        expositionParMassif.set(
          massif.nom,
          massif.exposition_pluie as ExpositionPluie
        );
      }
    );

    const plantesParId =
      new Map<number, Plante>();

    (donneesPlantes ?? []).forEach(
      (plante) => {
        plantesParId.set(
          plante.id,
          {
            ...plante,
            exposition_pluie:
              plante.massif
                ? expositionParMassif.get(plante.massif) ?? null
                : null,
          }
        );
      }
    );

    const tachesCompletes =
      donneesTaches
        .map((tache) => ({
          ...tache,
          plante: plantesParId.get(
            tache.plante_id
          ),
        }))
        .filter(
          (tache) => tache.plante
        );

    setTaches(tachesCompletes);
    setChargement(false);
  }

  async function marquerTacheTerminee(
    tacheId: number,
    userId: string
  ) {
    const { error } = await supabase
      .from("taches")
      .update({
        terminee: true,
        date_effectuee:
          new Date().toISOString(),
      })
      .eq("id", tacheId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Erreur validation tâche :",
        error
      );

      return false;
    }

    return true;
  }

  async function programmerProchainArrosage(
    planteId: number,
    userId: string
  ) {
    const {
      data: plante,
      error: erreurPlante,
    } = await supabase
      .from("plantes")
      .select(
        "id, arrosage_intervalle_jours"
      )
      .eq("id", planteId)
      .eq("user_id", userId)
      .single();

    if (erreurPlante) {
      console.error(
        "Erreur récupération intervalle d'arrosage :",
        erreurPlante
      );

      return false;
    }

    const intervalle = Number(
      plante?.arrosage_intervalle_jours
    );

    if (
      !Number.isFinite(intervalle) ||
      intervalle <= 0
    ) {
      console.error(
        "Intervalle d'arrosage invalide pour la plante :",
        planteId
      );

      return false;
    }

    const aujourdHui = dateAujourdhui();

    const maintenant = new Date();
    maintenant.setHours(12, 0, 0, 0);

    const prochaineDate = ajouterJours(
      maintenant,
      intervalle
    );

    const prochaineDateTexte =
      prochaineDate.toLocaleDateString(
        "en-CA"
      );

    const {
      error: erreurMiseAJourPlante,
    } = await supabase
      .from("plantes")
      .update({
        arrosage_derniere_date:
          aujourdHui,

        arrosage_prochaine_date:
          prochaineDateTexte,
      })
      .eq("id", planteId)
      .eq("user_id", userId);

    if (erreurMiseAJourPlante) {
      console.error(
        "Erreur mise à jour arrosage plante :",
        erreurMiseAJourPlante
      );

      return false;
    }

    const {
      error: erreurNouvelleTache,
    } = await supabase
      .from("taches")
      .insert({
        user_id:
          userId,

        plante_id:
          planteId,

        type_tache:
          "arrosage",

        titre:
          "Arroser",

        detail:
          "Arrosage conseillé par Feuillia.",

        date_prevue:
          prochaineDateTexte,

        terminee:
          false,
      });

    if (erreurNouvelleTache) {
      console.error(
        "Erreur création prochain arrosage :",
        erreurNouvelleTache
      );

      return false;
    }

    return true;
  }

  async function programmerNouvelleVerification(
    planteId: number,
    userId: string
  ) {
    const maintenant = new Date();
    maintenant.setHours(12, 0, 0, 0);

    const prochaineVerification =
      ajouterJours(
        maintenant,
        2
      );

    const dateVerification =
      prochaineVerification.toLocaleDateString(
        "en-CA"
      );

    const {
      error,
    } = await supabase
      .from("taches")
      .insert({
        user_id:
          userId,

        plante_id:
          planteId,

        type_tache:
          "verification_arrosage",

        titre:
          "Vérifier l’humidité de la terre",

        detail:
          "La terre était encore humide lors de la dernière vérification.",

        date_prevue:
          dateVerification,

        terminee:
          false,
      });

    if (error) {
      console.error(
        "Erreur création prochaine vérification :",
        error
      );

      return false;
    }

    return true;
  }

  function retirerTacheDeLaListe(
    tacheId: number
  ) {
    setTimeout(() => {
      setTaches((actuelles) =>
        actuelles.filter(
          (element) =>
            element.id !== tacheId
        )
      );

      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tacheId
          )
      );
    }, 700);
  }

  async function terminerTache(
    tacheId: number
  ) {
    if (
      tachesCochees.includes(tacheId)
    ) {
      return;
    }

    const tache = taches.find(
      (element) =>
        element.id === tacheId
    );

    if (!tache) {
      return;
    }

    setTachesCochees((actuelles) => [
      ...actuelles,
      tacheId,
    ]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tacheId
          )
      );

      return;
    }

    const validation =
      await marquerTacheTerminee(
        tacheId,
        user.id
      );

    if (!validation) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tacheId
          )
      );

      return;
    }

    const estUnArrosage =
      tache.type_tache
        .toLowerCase()
        .includes("arros") &&
      !tache.type_tache
        .toLowerCase()
        .includes("verification");

    if (estUnArrosage) {
      await programmerProchainArrosage(
        tache.plante_id,
        user.id
      );
    }

    retirerTacheDeLaListe(
      tacheId
    );
  }

  async function terreSecheJArrose(
    tache: Tache
  ) {
    if (
      tachesCochees.includes(tache.id)
    ) {
      return;
    }

    setTachesCochees((actuelles) => [
      ...actuelles,
      tache.id,
    ]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tache.id
          )
      );

      return;
    }

    const validation =
      await marquerTacheTerminee(
        tache.id,
        user.id
      );

    if (!validation) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tache.id
          )
      );

      return;
    }

    const programmation =
      await programmerProchainArrosage(
        tache.plante_id,
        user.id
      );

    if (!programmation) {
      console.error(
        "Impossible de programmer le prochain arrosage."
      );
    }

    retirerTacheDeLaListe(
      tache.id
    );
  }

  async function terreEncoreHumide(
    tache: Tache
  ) {
    if (
      tachesCochees.includes(tache.id)
    ) {
      return;
    }

    setTachesCochees((actuelles) => [
      ...actuelles,
      tache.id,
    ]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tache.id
          )
      );

      return;
    }

    const validation =
      await marquerTacheTerminee(
        tache.id,
        user.id
      );

    if (!validation) {
      setTachesCochees(
        (actuelles) =>
          actuelles.filter(
            (id) => id !== tache.id
          )
      );

      return;
    }

    const programmation =
      await programmerNouvelleVerification(
        tache.plante_id,
        user.id
      );

    if (!programmation) {
      console.error(
        "Impossible de programmer la prochaine vérification."
      );
    }

    retirerTacheDeLaListe(
      tache.id
    );
  }

  function iconeTache(
    typeTache: string
  ) {
    const type =
      typeTache.toLowerCase();

    if (
      type.includes("arros") ||
      type.includes("verification")
    ) {
      return (
        <Droplets
          size={17}
          className="text-[#5BA651]"
        />
      );
    }

    if (type.includes("tail")) {
      return (
        <Scissors
          size={17}
          className="text-[#5BA651]"
        />
      );
    }

    return (
      <Sprout
        size={17}
        className="text-[#5BA651]"
      />
    );
  }

  const groupes = taches.reduce(
    (
      resultat: Record<
        string,
        Tache[]
      >,
      tache
    ) => {
      const massif =
        tache.plante?.massif ||
        "Sans massif";

      if (!resultat[massif]) {
        resultat[massif] = [];
      }

      resultat[massif].push(
        tache
      );

      return resultat;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-6 py-8">
        <header>
          <a
            href="/"
            aria-label="Retour"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
          >
            <ArrowLeft size={20} />
          </a>

          <p className="mt-8 text-sm font-medium text-[#5BA651]">
            Mon jardin
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Aujourd’hui
          </h1>

          {!chargement && (
            <p className="mt-3 text-sm text-gray-600">
              {taches.length === 0
                ? "Tout est fait pour aujourd’hui 🌿"
                : `${taches.length} ${
                    taches.length > 1
                      ? "tâches à faire"
                      : "tâche à faire"
                  }`}
            </p>
          )}
        </header>

        <section className="mt-7 rounded-[26px] bg-white p-5 shadow-sm">
          {chargementMeteo ? (
            <p className="text-sm text-gray-500">
              Chargement de la météo...
            </p>
          ) : meteo ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#5BA651]">
                    <MapPin size={16} />
                    <span>{meteo.ville}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <ThermometerSun
                      size={26}
                      className="text-[#F2C94C]"
                    />
                    <p className="text-3xl font-semibold">
                      {Math.round(meteo.temperatureActuelle)}°
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    Maximum
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {Math.round(meteo.temperatureMax)}°
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#EEF5E9] px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <CloudRain
                      size={18}
                      className="shrink-0 text-[#5BA651]"
                    />
                    <p className="text-xs font-medium text-gray-500">
                      Dernières 24 h
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    {meteo.pluieDernieres24h.toFixed(1)} mm
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EEF5E9] px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <CloudRain
                      size={18}
                      className="shrink-0 text-[#5BA651]"
                    />
                    <p className="text-xs font-medium text-gray-500">
                      Prochaines 24 h
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    {meteo.pluieProchaines24h.toFixed(1)} mm
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                {conseilMeteoArrosage()}
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 text-gray-500">
              {erreurMeteo}
            </p>
          )}
        </section>

        {chargement ? (
          <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Chargement...
            </p>
          </div>
        ) : taches.length === 0 ? (
          <section className="mt-8 rounded-3xl bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5E9]">
              <Check
                size={28}
                className="text-[#5BA651]"
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              Jardin à jour
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Vous n’avez plus aucune tâche
              prévue pour aujourd’hui.
            </p>
          </section>
        ) : (
          <section className="mt-7 space-y-7">
            {Object.entries(
              groupes
            ).map(
              ([massif, tachesMassif]) => (
                <div key={massif}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5BA651]">
                      {massif}
                    </h2>

                    {tachesMassif[0]?.plante?.exposition_pluie && (
                      <span className="rounded-full bg-[#EEF5E9] px-2.5 py-1 text-[10px] font-medium text-[#5BA651]">
                        {tachesMassif[0].plante.exposition_pluie ===
                        "ciel_ouvert"
                          ? "🌧️ Ciel ouvert"
                          : tachesMassif[0].plante.exposition_pluie ===
                            "partiellement_couvert"
                          ? "🌦️ Partiellement couvert"
                          : "🏠 Sous toit"}
                      </span>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-[26px] bg-white shadow-sm">
                    {tachesMassif.map(
                      (tache, index) => {
                        const cochee =
                          tachesCochees.includes(
                            tache.id
                          );

                        const estVerification =
                          tache.type_tache ===
                          "verification_arrosage";

                        return (
                          <div
                            key={tache.id}
                          >
                            <div
                              className={`px-4 py-4 transition-opacity duration-300 ${
                                cochee
                                  ? "opacity-40"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EEF5E9]">
                                  {tache.plante
                                    ?.photo_url ? (
                                    <img
                                      src={
                                        tache
                                          .plante
                                          .photo_url
                                      }
                                      alt={
                                        tache
                                          .plante
                                          .nom_commun
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Sprout
                                        size={25}
                                        className="text-[#5BA651]"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">
                                    {
                                      tache
                                        .plante
                                        ?.nom_commun
                                    }
                                  </p>

                                  <div className="mt-1 flex items-center gap-1.5">
                                    {iconeTache(
                                      tache.type_tache
                                    )}

                                    <p className="text-sm text-gray-700">
                                      {
                                        tache.titre
                                      }
                                    </p>
                                  </div>

                                  {tache.detail && (
                                    <p className="mt-1 text-xs leading-5 text-gray-400">
                                      {
                                        tache.detail
                                      }
                                    </p>
                                  )}
                                </div>

                                {!estVerification && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      terminerTache(
                                        tache.id
                                      )
                                    }
                                    aria-label="Tâche effectuée"
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                      cochee
                                        ? "border-[#5BA651] bg-[#5BA651] text-white"
                                        : "border-[#B8C7B2] bg-white text-transparent"
                                    }`}
                                  >
                                    <Check
                                      size={16}
                                    />
                                  </button>
                                )}
                              </div>

                              {estVerification && (
                                <div className="mt-4 grid grid-cols-2 gap-2 pl-[68px]">
                                  <button
                                    type="button"
                                    disabled={cochee}
                                    onClick={() =>
                                      terreSecheJArrose(
                                        tache
                                      )
                                    }
                                    className="rounded-2xl bg-[#1B4332] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    💧 Terre sèche
                                    <br />
                                    J’arrose
                                  </button>

                                  <button
                                    type="button"
                                    disabled={cochee}
                                    onClick={() =>
                                      terreEncoreHumide(
                                        tache
                                      )
                                    }
                                    className="rounded-2xl border border-[#A7D08C] bg-[#EEF5E9] px-3 py-3 text-xs font-semibold text-[#1B4332] disabled:opacity-50"
                                  >
                                    ✓ Terre encore
                                    <br />
                                    humide
                                  </button>
                                </div>
                              )}
                            </div>

                            {index <
                              tachesMassif.length -
                                1 && (
                              <div className="ml-[84px] h-px bg-[#EDF0E9]" />
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )
            )}
          </section>
        )}

        <BoutonAjouter />
      </div>
    </main>
  );
}