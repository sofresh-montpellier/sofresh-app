"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudRain,
  Droplets,
  MapPin,
  Scissors,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import BoutonAjouter from "../ajouter-massif/components/BoutonAjouter";

type ExpositionPluie =
  | "ciel_ouvert"
  | "partiellement_couvert"
  | "sous_toit"
  | null;

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

type Plante = {
  id: number;
  nom_commun: string;
  photo_url: string | null;
  massif: string | null;
  exposition_pluie?: ExpositionPluie;
  exposition_vent?: ExpositionVent;
  type_sol?: TypeSol;
  exposition_soleil?: ExpositionSoleil;
  arrosage_intervalle_jours?: number | null;
  bilan_hydrique?: number | null;
  bilan_hydrique_date?: string | null;
  derniere_verification_humidite?: string | null;
  dernier_etat_humidite?: string | null;
  seuil_secheresse_appris?: number | null;
  mode_culture?: "pleine_terre" | "pot_bac" | "pot_exterieur" | "pot_interieur" | null;
  pot_diametre_cm?: number | null;
  pot_hauteur_cm?: number | null;
  pot_volume_litres?: number | null;
  pot_matiere?: string | null;
  pot_trous_drainage?: boolean | null;
  type_site?: "exterieur" | "interieur" | null;
  periode_taille?: string | null;
};

type Tache = {
  id: number;
  plante_id: number;
  type_tache: string;
  titre: string;
  detail: string | null;
  date_prevue: string;
  periode_fertilisation_id?: number | null;
  plante?: Plante;
};

type Meteo = {
  temperatureMinProchaines24h: number | null;
  heureTemperatureMinProchaines24h: string | null;
  froidPrevisionsDisponibles: boolean;
  timezone: string;
  ville: string;
  temperatureActuelle: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationActuelle: number;
  pluieActuelle: number;
  pluieDernieres24h: number;
  pluieProchaines24h: number;
  vitesseVentActuelle: number;
  et0Aujourdhui: number;
  et0Dernieres24h: number;
  et0Prochaines24h: number;
};

type PlanteFroid = Pick<Plante, "id" | "nom_commun" | "massif" | "mode_culture"> & {
  nom_botanique?: string | null;
  temperature_min_toleree: number | null;
  seuil_vigilance_froid: number | null;
  protection_froid: string | null;
};
type AlerteFroid = {
  plante: PlanteFroid;
  seuil: number;
  minimumTolere: number | null;
  danger: boolean;
};

function nombreFroid(valeur: unknown): number | null {
  if (typeof valeur !== "number" && typeof valeur !== "string") return null;
  if (typeof valeur === "string" && !valeur.trim()) return null;
  const resultat = Number(valeur);
  return Number.isFinite(resultat) ? resultat : null;
}

type SiteFroid = { nom: string; type_site: string | null };
const champsFroid = ["temperature_min_toleree", "seuil_vigilance_froid", "protection_froid"] as const;
function champFroidVide(valeur: unknown) {
  return valeur === null || valeur === undefined || (typeof valeur === "string" && !valeur.trim());
}

function normaliserNomSite(valeur: unknown) {
  if (typeof valeur !== "string") return "";
  return valeur
    .normalize("NFKC")
    .replace(/[’‘ʼ＇`´]/g, "'")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr-FR");
}

function correspondancesSite(plante: PlanteFroid, sites: SiteFroid[]) {
  const nomMassif = normaliserNomSite(plante.massif);
  if (!nomMassif) return [];
  return sites.filter(site => normaliserNomSite(site.nom) === nomMassif);
}

function contexteFroid(plante: PlanteFroid, sites: SiteFroid[]) {
  const correspondances = correspondancesSite(plante, sites);
  const typeSiteBrut = correspondances[0]?.type_site?.trim().toLocaleLowerCase("fr-FR") ?? "";
  if (correspondances.length !== 1 || !["interieur", "exterieur"].includes(typeSiteBrut)) return null;
  const typeSite = typeSiteBrut as "interieur" | "exterieur";
  if ((plante.mode_culture === "pot_interieur" && typeSite !== "interieur") ||
      (plante.mode_culture === "pot_exterieur" && typeSite !== "exterieur")) return null;
  return typeSite;
}
function preparerComplementFroid(plante: PlanteFroid, donnees: Record<string, unknown>) {
  const fusion = {
    temperature_min_toleree: champFroidVide(plante.temperature_min_toleree) ? donnees.temperature_min_toleree : plante.temperature_min_toleree,
    seuil_vigilance_froid: champFroidVide(plante.seuil_vigilance_froid) ? donnees.seuil_vigilance_froid : plante.seuil_vigilance_froid,
    protection_froid: champFroidVide(plante.protection_froid) ? donnees.protection_froid : plante.protection_froid,
  };
  const minimum = nombreFroid(fusion.temperature_min_toleree);
  const seuil = nombreFroid(fusion.seuil_vigilance_froid);
  if (minimum === null || seuil === null || minimum < -50 || minimum > 30 ||
      seuil < -50 || seuil > 35 || seuil < minimum ||
      typeof fusion.protection_froid !== "string" || !fusion.protection_froid.trim()) {
    throw new Error("Valeurs froid incohérentes : aucune donnée modifiée. Vérifiez la fiche.");
  }
  const patch: Record<string, number | string> = {};
  if (champFroidVide(plante.temperature_min_toleree)) patch.temperature_min_toleree = minimum;
  if (champFroidVide(plante.seuil_vigilance_froid)) patch.seuil_vigilance_froid = seuil;
  if (champFroidVide(plante.protection_froid)) patch.protection_froid = fusion.protection_froid.trim();
  return patch;
}

function diagnosticFroid(plantes: PlanteFroid[], sites: SiteFroid[]) {
  return plantes.flatMap(plante => {
    const typeSite = contexteFroid(plante, sites);
    if (!typeSite) {
      const site = typeof plante.massif === "string" && plante.massif.trim()
        ? `« ${plante.massif.trim()} »`
        : "non renseigné";
      return [`${plante.nom_commun} : site ${site} absent, ambigu ou type intérieur/extérieur à vérifier.`];
    }
    if (typeSite === "interieur") return [];
    if (champFroidVide(plante.nom_botanique)) return [`${plante.nom_commun} : nom botanique manquant.`];
    if (!plante.mode_culture) return [`${plante.nom_commun} : mode de culture à renseigner.`];
    if (champsFroid.some(champ => champFroidVide(plante[champ]))) return [`${plante.nom_commun} : données froid à compléter avec le bouton ci-dessous.`];
    try { preparerComplementFroid(plante, {}); } catch { return [`${plante.nom_commun} : seuils incohérents à corriger dans la fiche.`]; }
    return [];
  });
}

function evaluerFroid(
  plantes: PlanteFroid[],
  sites: { nom: string; type_site: string | null }[],
  minimum: number
) {
  const alertes: AlerteFroid[] = [];
  let nonEvaluees = 0;
  const ids = new Set<number>();
  for (const plante of plantes) {
    if (ids.has(plante.id)) continue;
    ids.add(plante.id);
    const correspondances = correspondancesSite(plante, sites);
    const typesSites = correspondances.map(
      site => site.type_site?.trim().toLocaleLowerCase("fr-FR") ?? ""
    );
    if (plante.mode_culture === "pot_interieur" ||
        typesSites.includes("interieur")) continue;
    // Pas de supposition extérieur si le site est absent, ancien ou ambigu.
    if (correspondances.length !== 1 || typesSites[0] !== "exterieur") {
      nonEvaluees++;
      continue;
    }
    const seuil = nombreFroid(plante.seuil_vigilance_froid);
    const minimumTolere = nombreFroid(plante.temperature_min_toleree);
    if (seuil === null || (minimumTolere !== null && seuil < minimumTolere)) {
      nonEvaluees++;
      continue;
    }
    if (minimum <= seuil) alertes.push({
      plante, seuil, minimumTolere,
      danger: minimumTolere !== null && minimum <= minimumTolere,
    });
  }
  alertes.sort((a, b) => Number(b.danger) - Number(a.danger) || b.seuil - a.seuil);
  return { alertes, nonEvaluees };
}

function afficherHeureFroid(heure: string | null, timezone: string) {
  if (!heure || !Number.isFinite(Date.parse(heure))) return "Heure indisponible";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone, weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(heure));
  } catch {
    return "Heure indisponible";
  }
}

export default function AujourdhuiPage() {
  // Outil exceptionnel de reprise des anciennes fiches, masqué dans l'interface client.
  const afficherOutilsFroid = false;
  const [taches, setTaches] = useState<Tache[]>([]);
  const [chargement, setChargement] = useState(true);
  const [tachesCochees, setTachesCochees] = useState<number[]>([]);
  const [meteo, setMeteo] = useState<Meteo | null>(null);
  const [chargementMeteo, setChargementMeteo] = useState(true);
  const [erreurMeteo, setErreurMeteo] = useState("");
  const [alertesFroid, setAlertesFroid] = useState<AlerteFroid[]>([]);
  const [meteoFroid, setMeteoFroid] = useState<Meteo | null>(null);
  const [chargementFroid, setChargementFroid] = useState(true);
  const [erreurFroid, setErreurFroid] = useState("");
  const [plantesFroidNonEvaluees, setPlantesFroidNonEvaluees] = useState(0);
  const [diagnosticsFroid, setDiagnosticsFroid] = useState<string[]>([]);
  const [completionFroid, setCompletionFroid] = useState(false);
  const verrouCompletionFroid = useRef(false);
  const [progressionFroid, setProgressionFroid] = useState("");
  const [resultatsCompletionFroid, setResultatsCompletionFroid] = useState<string[]>([]);
  const [revisionFroid, setRevisionFroid] = useState(0);

  useEffect(() => {
    initialiserPage();
  }, []);

  // Lecture seule : aucune tâche créée, aucun arrosage réévalué par ce rafraîchissement.
  useEffect(() => {
    let annule = false;
    let enCours = false;
    async function actualiserFroid() {
      if (enCours) return;
      enCours = true;
      if (!annule) {
        setChargementFroid(true);
        setErreurFroid("");
        setAlertesFroid([]);
        setMeteoFroid(null);
        setPlantesFroidNonEvaluees(0);
      }
      try {
        const { data: { user }, error: erreurUtilisateur } = await supabase.auth.getUser();
        if (erreurUtilisateur || !user) throw new Error("Connexion nécessaire pour vérifier le froid.");
        const { data: profil, error: erreurProfil } = await supabase.from("profils")
          .select("latitude, longitude").eq("user_id", user.id).maybeSingle();
        const latitude = nombreFroid(profil?.latitude);
        const longitude = nombreFroid(profil?.longitude);
        if (erreurProfil || latitude === null || longitude === null) {
          throw new Error("Localisation du jardin manquante : surveillance du froid indisponible.");
        }
        const [response, plantesResultat, sitesResultat] = await Promise.all([
          fetch("/api/meteo", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }), cache: "no-store",
          }),
          supabase.from("plantes")
            .select("id, nom_commun, nom_botanique, massif, mode_culture, temperature_min_toleree, seuil_vigilance_froid, protection_froid")
            .eq("user_id", user.id),
          supabase.from("massifs").select("nom, type_site").eq("user_id", user.id),
        ]);
        if (plantesResultat.error || sitesResultat.error) {
          throw new Error("Impossible de lire les données froid des plantes ou des sites.");
        }
        if (!annule) setDiagnosticsFroid(diagnosticFroid((plantesResultat.data ?? []) as PlanteFroid[], sitesResultat.data ?? []));
        const donnees = await response.json();
        const minimum = nombreFroid(donnees.temperatureMinProchaines24h);
        if (!response.ok || donnees.froidPrevisionsDisponibles !== true || minimum === null) {
          throw new Error("Prévisions froid indisponibles. Vérifiez la météo avant de laisser les plantes sensibles dehors.");
        }
        const resultat = evaluerFroid(
          (plantesResultat.data ?? []) as PlanteFroid[], sitesResultat.data ?? [], minimum
        );
        if (!annule) {
          setAlertesFroid(resultat.alertes);
          setPlantesFroidNonEvaluees(resultat.nonEvaluees);
          setMeteoFroid({ ...donnees, temperatureMinProchaines24h: minimum,
            timezone: typeof donnees.timezone === "string" ? donnees.timezone : "UTC" });
        }
      } catch (error) {
        if (!annule) setErreurFroid(error instanceof Error ? error.message : "Surveillance du froid indisponible.");
      } finally {
        enCours = false;
        if (!annule) setChargementFroid(false);
      }
    }
    void actualiserFroid();
    const intervalle = window.setInterval(() => { void actualiserFroid(); }, 15 * 60 * 1000);
    const auRetour = () => { if (document.visibilityState === "visible") void actualiserFroid(); };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      annule = true;
      window.clearInterval(intervalle);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [revisionFroid]);

  async function completerDonneesFroid() {
    if (verrouCompletionFroid.current) return;
    if (!window.confirm("Compléter les champs froid manquants des plantes extérieures ? Cela utilise votre API OpenAI et peut prendre plusieurs minutes. Les valeurs existantes seront conservées.")) return;
    verrouCompletionFroid.current = true;
    setCompletionFroid(true);
    setResultatsCompletionFroid([]);
    setProgressionFroid("Lecture des plantes…");
    let completees = 0;
    try {
      const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
      if (erreurUser || !user) throw new Error("Reconnectez-vous pour compléter les données.");
      const resultat = await supabase.from("plantes")
        .select("id, nom_commun, nom_botanique, massif, mode_culture, temperature_min_toleree, seuil_vigilance_froid, protection_froid")
        .eq("user_id", user.id).order("id");
      if (resultat.error) throw new Error("Impossible de charger les plantes.");
      const candidates = ((resultat.data ?? []) as PlanteFroid[]).filter(p => champsFroid.some(champ => champFroidVide(p[champ])));
      for (let index = 0; index < candidates.length; index++) {
        const candidate = candidates[index];
        setProgressionFroid(`${index + 1}/${candidates.length} — ${candidate.nom_commun}`);
        try {
          // Relire juste avant la génération pour ne pas réutiliser un ancien état.
          const { data: plante, error } = await supabase.from("plantes")
            .select("id, nom_commun, nom_botanique, massif, mode_culture, temperature_min_toleree, seuil_vigilance_froid, protection_froid")
            .eq("id", candidate.id).eq("user_id", user.id).single();
          if (error || !plante) throw new Error("Lecture de la fiche impossible.");
          if (!champsFroid.some(champ => champFroidVide(plante[champ]))) continue;
          const sites = await supabase.from("massifs").select("nom, type_site").eq("user_id", user.id);
          if (sites.error) throw new Error("Lecture du site impossible.");
          const typeSite = contexteFroid(plante as PlanteFroid, sites.data ?? []);
          if (!typeSite) throw new Error("Site à vérifier : aucune génération lancée.");
          if (typeSite === "interieur") continue;
          if (!plante.nom_botanique?.trim()) throw new Error("Nom botanique manquant.");
          const modeCulture = plante.mode_culture === "pleine_terre" ? "pleine_terre" :
            ["pot_bac", "pot_exterieur"].includes(plante.mode_culture ?? "") ? "pot_bac" : null;
          if (!modeCulture) throw new Error("Mode de culture à renseigner.");
          const response = await fetch("/api/completer-froid", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nomCommun: plante.nom_commun, nomBotanique: plante.nom_botanique, modeCulture, typeSite }),
            signal: AbortSignal.timeout(120000),
          });
          if (!response.ok) throw new Error(`Génération impossible (HTTP ${response.status}). Réessayez plus tard.`);
          const donnees = await response.json();
          if (!donnees || typeof donnees !== "object") throw new Error("Réponse de génération invalide.");
          const patch = preparerComplementFroid(plante as PlanteFroid, donnees);
          // Vérifier aussi le site après l'appel qui peut être long.
          const sitesActuels = await supabase.from("massifs").select("nom, type_site").eq("user_id", user.id);
          if (sitesActuels.error || contexteFroid(plante as PlanteFroid, sitesActuels.data ?? []) !== typeSite) {
            throw new Error("Site modifié pendant la génération : recommencez.");
          }
          let miseAJour = supabase.from("plantes").update(patch).eq("id", plante.id).eq("user_id", user.id);
          // Écriture conditionnelle : si une autre page a modifié la fiche, ne rien écraser.
          for (const champ of [...champsFroid, "massif", "mode_culture", "nom_botanique"] as const) {
            const avant = plante[champ];
            miseAJour = avant === null || avant === undefined ? miseAJour.is(champ, null) : miseAJour.eq(champ, avant);
          }
          const sauvegarde = await miseAJour.select("id");
          if (sauvegarde.error) throw new Error("Enregistrement refusé ou impossible. Aucune réussite confirmée.");
          if (sauvegarde.data?.length !== 1) throw new Error("Fiche modifiée ou inaccessible : aucune donnée écrasée, recommencez.");
          completees++;
          setResultatsCompletionFroid(lignes => [...lignes, `${candidate.nom_commun} : données enregistrées.`]);
        } catch (error) {
          setResultatsCompletionFroid(lignes => [...lignes, `${candidate.nom_commun} : ${error instanceof Error ? error.message : "Échec, réessayez."}`]);
        }
      }
      setProgressionFroid(`Terminé : ${completees} fiche(s) complétée(s). Les plantes intérieures sont exclues.`);
    } catch (error) {
      setProgressionFroid(error instanceof Error ? error.message : "Impossible de compléter les données.");
    } finally {
      verrouCompletionFroid.current = false;
      setCompletionFroid(false);
      setRevisionFroid(revision => revision + 1);
    }
  }

  async function initialiserPage() {
    setChargement(true);

    const meteoChargee = await chargerMeteo();

    if (meteoChargee) {
      await reevaluerArrosagesDuJour(meteoChargee);
    }

    await chargerTaches();
  }

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
      return null;
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
      return null;
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
      return null;
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
      const temperatureMin = Number(
        donnees.temperatureMin
      );
      const precipitationActuelle = Number(
        donnees.precipitationActuelle
      );
      const pluieActuelle = Number(
        donnees.pluieActuelle
      );
      const pluieDernieres24h = Number(
        donnees.pluieDernieres24h
      );
      const pluieProchaines24h = Number(
        donnees.pluieProchaines24h
      );
      const vitesseVentActuelle = Number(
        donnees.vitesseVentActuelle
      );
      const et0Aujourdhui = Number(
        donnees.et0Aujourdhui
      );
      const et0Dernieres24h = Number(
        donnees.et0Dernieres24h
      );
      const et0Prochaines24h = Number(
        donnees.et0Prochaines24h
      );

      if (
        !Number.isFinite(temperatureActuelle) ||
        !Number.isFinite(temperatureMax) ||
        !Number.isFinite(temperatureMin) ||
        !Number.isFinite(precipitationActuelle) ||
        !Number.isFinite(pluieActuelle) ||
        !Number.isFinite(pluieDernieres24h) ||
        !Number.isFinite(pluieProchaines24h) ||
        !Number.isFinite(vitesseVentActuelle) ||
        !Number.isFinite(et0Aujourdhui) ||
        !Number.isFinite(et0Dernieres24h) ||
        !Number.isFinite(et0Prochaines24h)
      ) {
        throw new Error("Données météo incomplètes.");
      }

      const meteoComplete: Meteo = {
        temperatureMinProchaines24h: nombreFroid(donnees.temperatureMinProchaines24h),
        heureTemperatureMinProchaines24h: donnees.heureTemperatureMinProchaines24h ?? null,
        froidPrevisionsDisponibles: donnees.froidPrevisionsDisponibles === true,
        timezone: donnees.timezone ?? "UTC",
        ville: profil.ville_jardin,
        temperatureActuelle,
        temperatureMax,
        temperatureMin,
        precipitationActuelle,
        pluieActuelle,
        pluieDernieres24h,
        pluieProchaines24h,
        vitesseVentActuelle,
        et0Aujourdhui,
        et0Dernieres24h,
        et0Prochaines24h,
      };

      setMeteo(meteoComplete);
      setChargementMeteo(false);
      return meteoComplete;
    } catch (error) {
      console.error("Erreur météo :", error);
      setErreurMeteo("Impossible de récupérer la météo.");
      setChargementMeteo(false);
      return null;
    }
  }

  function bilanClimatiquePassePourSite(
    meteoDuJour: Meteo,
    expositionPluie: ExpositionPluie,
    typeSite: "exterieur" | "interieur" | null
  ) {
    // Une plante intérieure ne reçoit ni pluie extérieure ni ET₀ extérieur.
    // Son apprentissage repose donc sur les observations sec/humide et
    // l'intervalle de référence, sans inventer un coefficient climatique.
    if (typeSite === "interieur") {
      return null;
    }

    if (expositionPluie === "sous_toit") {
      return meteoDuJour.et0Dernieres24h;
    }

    if (
      expositionPluie === "partiellement_couvert" &&
      meteoDuJour.pluieDernieres24h > 0
    ) {
      return null;
    }

    return (
      meteoDuJour.et0Dernieres24h -
      meteoDuJour.pluieDernieres24h
    );
  }

  async function reevaluerArrosagesDuJour(
    meteoDuJour: Meteo
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const aujourdHui = dateAujourdhui();

    const { data: plantes, error: erreurPlantes } =
      await supabase
        .from("plantes")
        .select(
          "id, massif, mode_culture, pot_diametre_cm, pot_hauteur_cm, pot_volume_litres, pot_matiere, pot_trous_drainage, bilan_hydrique, bilan_hydrique_date, seuil_secheresse_appris"
        )
        .eq("user_id", user.id);

    if (erreurPlantes || !plantes) {
      console.error(
        "Erreur réévaluation hydrique :",
        erreurPlantes
      );
      return;
    }

    const { data: massifs, error: erreurMassifs } =
      await supabase
        .from("massifs")
        .select("nom, type_site, exposition_pluie")
        .eq("user_id", user.id);

    if (erreurMassifs) {
      console.error(
        "Erreur chargement sites pour réévaluation :",
        erreurMassifs
      );
      return;
    }

    const pluieParSite = new Map<
      string,
      ExpositionPluie
    >();

    const typeSiteParNom = new Map<
      string,
      "exterieur" | "interieur" | null
    >();

    (massifs ?? []).forEach((site) => {
      pluieParSite.set(
        site.nom,
        site.exposition_pluie as ExpositionPluie
      );

      typeSiteParNom.set(
        site.nom,
        (site.type_site as "exterieur" | "interieur" | null) ?? "exterieur"
      );
    });

    for (const plante of plantes) {
      let bilan = Number(plante.bilan_hydrique ?? 0);

      if (!Number.isFinite(bilan) || bilan < 0) {
        bilan = 0;
      }

      const dejaCalculeAujourdHui =
        plante.bilan_hydrique_date === aujourdHui;

      const expositionPluie = plante.massif
        ? pluieParSite.get(plante.massif) ?? null
        : null;

      const typeSite = plante.massif
        ? typeSiteParNom.get(plante.massif) ?? "exterieur"
        : "exterieur";

      if (!dejaCalculeAujourdHui) {
        const variation = bilanClimatiquePassePourSite(
          meteoDuJour,
          expositionPluie,
          typeSite
        );

        if (variation !== null) {
          bilan = Math.max(
            0,
            Number((bilan + variation).toFixed(1))
          );
        }

        const { error: erreurBilan } =
          await supabase
            .from("plantes")
            .update({
              bilan_hydrique: bilan,
              bilan_hydrique_date: aujourdHui,
            })
            .eq("id", plante.id)
            .eq("user_id", user.id);

        if (erreurBilan) {
          console.error(
            "Erreur mise à jour bilan hydrique :",
            erreurBilan
          );
          continue;
        }
      }

      const seuil = Number(
        plante.seuil_secheresse_appris
      );

      if (
        !Number.isFinite(seuil) ||
        seuil <= 0 ||
        bilan < seuil
      ) {
        continue;
      }

      const { data: tacheExistante } =
        await supabase
          .from("taches")
          .select("id, date_prevue, type_tache")
          .eq("user_id", user.id)
          .eq("plante_id", plante.id)
          .eq("terminee", false)
          .order("date_prevue", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (!tacheExistante) {
        await supabase.from("taches").insert({
          user_id: user.id,
          plante_id: plante.id,
          type_tache: "verification_arrosage",
          titre: "Vérifier l’humidité de la terre",
          detail:
            "Feuillia a retrouvé un niveau de dessèchement proche de celui observé lorsque cette plante était sèche.",
          date_prevue: aujourdHui,
          terminee: false,
        });
        continue;
      }

      if (tacheExistante.date_prevue > aujourdHui) {
        await supabase
          .from("taches")
          .update({
            type_tache: "verification_arrosage",
            titre: "Vérifier l’humidité de la terre",
            detail:
              "Feuillia a avancé cette vérification car le niveau de dessèchement estimé a atteint celui déjà observé lorsque cette plante était sèche.",
            date_prevue: aujourdHui,
          })
          .eq("id", tacheExistante.id)
          .eq("user_id", user.id);
      }
    }
  }

  function calculerBilanClimatique24hPasse() {
    if (!meteo) {
      return null;
    }

    return Number(
      (
        meteo.et0Dernieres24h -
        meteo.pluieDernieres24h
      ).toFixed(1)
    );
  }

  function calculerBilanClimatique24hAvenir() {
    if (!meteo) {
      return null;
    }

    return Number(
      (
        meteo.et0Prochaines24h -
        meteo.pluieProchaines24h
      ).toFixed(1)
    );
  }

  function bilanClimatiqueTotal48h() {
    if (!meteo) {
      return null;
    }

    return Number(
      (
        meteo.et0Dernieres24h +
        meteo.et0Prochaines24h -
        meteo.pluieDernieres24h -
        meteo.pluieProchaines24h
      ).toFixed(1)
    );
  }

  function messageMeteoUtilisateur() {
    if (!meteo) {
      return "";
    }

    if (
      meteo.precipitationActuelle > 0 ||
      meteo.pluieActuelle > 0
    ) {
      return "Il pleut actuellement sur le jardin. Pour les plantes exposées à la pluie, attendez avant d’arroser et vérifiez l’humidité de la terre.";
    }

    const bilanPasse =
      calculerBilanClimatique24hPasse();

    const bilanAvenir =
      calculerBilanClimatique24hAvenir();

    if (
      bilanPasse !== null &&
      bilanAvenir !== null &&
      bilanPasse <= 0 &&
      bilanAvenir <= 0
    ) {
      return "La pluie compense actuellement la demande climatique. Vérifiez la terre avant tout arrosage.";
    }

    if (
      bilanPasse !== null &&
      bilanAvenir !== null &&
      bilanPasse > 0 &&
      bilanAvenir > 0
    ) {
      return "Conditions asséchantes : surveillez aujourd’hui les plantes dont la terre sèche rapidement.";
    }

    return "Conditions variables : Feuillia vérifie plante par plante avant de conseiller un arrosage.";
  }

  function facteursLocaux(plante?: Plante) {
    if (!plante) {
      return {
        assechants: [] as string[],
        retenteurs: [] as string[],
      };
    }

    const assechants: string[] = [];
    const retenteurs: string[] = [];

    const estEnPot =
      plante.mode_culture === "pot_bac" ||
      plante.mode_culture === "pot_exterieur" ||
      plante.mode_culture === "pot_interieur";

    if (estEnPot) {
      assechants.push("culture en pot");
    }

    if (plante.pot_matiere === "terre_cuite") {
      assechants.push("pot en terre cuite");
    }

    if (plante.pot_trous_drainage === false) {
      retenteurs.push("pot sans trou de drainage");
    }

    if (plante.type_sol === "leger") {
      assechants.push("sol léger");
    }

    if (plante.type_sol === "substrat") {
      assechants.push("culture en substrat");
    }

    if (plante.exposition_soleil === "plein_soleil") {
      assechants.push("plein soleil");
    }

    if (plante.exposition_vent === "expose") {
      assechants.push("site exposé au vent");
    }

    if (plante.type_sol === "lourd") {
      retenteurs.push("sol lourd");
    }

    if (plante.exposition_soleil === "ombre") {
      retenteurs.push("ombre");
    }

    if (plante.exposition_vent === "abrite") {
      retenteurs.push("site abrité");
    }

    return {
      assechants,
      retenteurs,
    };
  }

  function pluiePeutAvoirCompense(plante?: Plante) {
    if (
      !meteo ||
      !plante?.exposition_pluie ||
      plante.type_site === "interieur"
    ) {
      return false;
    }

    if (plante.exposition_pluie === "sous_toit") {
      return false;
    }

    const pluieTotale =
      meteo.pluieDernieres24h +
      meteo.pluieProchaines24h;

    if (pluieTotale <= 0) {
      return false;
    }

    if (
      plante.exposition_pluie ===
      "partiellement_couvert"
    ) {
      return true;
    }

    const et0Totale =
      meteo.et0Dernieres24h +
      meteo.et0Prochaines24h;

    return pluieTotale >= et0Totale;
  }

  function construireDetailVerification(
    plante?: Plante
  ) {
    if (!plante) {
      return "Vérifiez l’humidité de la terre avant d’arroser.";
    }

    const facteurs = facteursLocaux(plante);

    if (plante.type_site === "interieur") {
      const contexte =
        facteurs.assechants.length > 0
          ? ` (${facteurs.assechants.join(", ")})`
          : "";

      return `Cette plante est à l’intérieur${contexte}. La météo extérieure n’est pas utilisée pour décider de l’arrosage : vérifiez directement l’humidité du substrat.`;
    }

    const bilan48h = bilanClimatiqueTotal48h();

    if (pluiePeutAvoirCompense(plante)) {
      if (
        plante.exposition_pluie ===
        "partiellement_couvert"
      ) {
        return "De la pluie est observée ou prévue, mais ce site n’est que partiellement exposé. Vérifiez la terre avant d’arroser.";
      }

      return "La pluie reçue ou prévue est au moins du même ordre que la demande climatique sur la période. Vérifiez la terre avant d’arroser.";
    }

    if (
      bilan48h !== null &&
      bilan48h > 0 &&
      facteurs.assechants.length > 0
    ) {
      return `Conditions asséchantes avec ${facteurs.assechants.join(
        ", "
      )}. Vérifiez la terre aujourd’hui et arrosez seulement si elle est sèche.`;
    }

    if (facteurs.retenteurs.length > 0) {
      return `Ce site peut conserver l’humidité plus longtemps (${facteurs.retenteurs.join(
        ", "
      )}). Vérifiez la terre avant d’arroser.`;
    }

    return "L’échéance d’arrosage est atteinte. Vérifiez l’humidité de la terre avant d’arroser.";
  }

  function rendreTacheIntelligente(tache: Tache): Tache {
    const type = tache.type_tache.toLowerCase();

    const estArrosage =
      type.includes("arros") &&
      !type.includes("verification");

    if (!estArrosage) {
      return tache;
    }

    return {
      ...tache,
      type_tache: "verification_arrosage",
      titre: pluiePeutAvoirCompense(tache.plante)
        ? "Vérifier avant d’arroser"
        : "Vérifier l’humidité de la terre",
      detail: construireDetailVerification(
        tache.plante
      ),
    };
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
        date_prevue,
        periode_fertilisation_id
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
        "id, nom_commun, photo_url, massif, mode_culture, pot_diametre_cm, pot_hauteur_cm, pot_volume_litres, pot_matiere, pot_trous_drainage, arrosage_intervalle_jours, bilan_hydrique, bilan_hydrique_date, derniere_verification_humidite, dernier_etat_humidite, seuil_secheresse_appris, periode_taille"
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
        .select(
          "nom, type_site, exposition_pluie, exposition_vent, type_sol, exposition_soleil"
        )
        .eq("user_id", user.id);

    if (erreurMassifs) {
      console.error(
        "Erreur chargement exposition des massifs :",
        erreurMassifs
      );
    }

    const expositionParMassif =
      new Map<string, ExpositionPluie>();

    const expositionVentParMassif =
      new Map<string, ExpositionVent>();

    const typeSolParMassif =
      new Map<string, TypeSol>();

    const expositionSoleilParMassif =
      new Map<string, ExpositionSoleil>();

    const typeSiteParMassif =
      new Map<string, "exterieur" | "interieur" | null>();

    (donneesMassifs ?? []).forEach(
      (massif) => {
        expositionParMassif.set(
          massif.nom,
          massif.exposition_pluie as ExpositionPluie
        );

        expositionVentParMassif.set(
          massif.nom,
          massif.exposition_vent as ExpositionVent
        );

        typeSolParMassif.set(
          massif.nom,
          massif.type_sol as TypeSol
        );

        expositionSoleilParMassif.set(
          massif.nom,
          massif.exposition_soleil as ExpositionSoleil
        );

        typeSiteParMassif.set(
          massif.nom,
          (massif.type_site as "exterieur" | "interieur" | null) ?? "exterieur"
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

            exposition_vent:
              plante.massif
                ? expositionVentParMassif.get(plante.massif) ?? null
                : null,

            type_sol:
              plante.massif
                ? typeSolParMassif.get(plante.massif) ?? null
                : null,

            exposition_soleil:
              plante.massif
                ? expositionSoleilParMassif.get(plante.massif) ?? null
                : null,

            type_site:
              plante.massif
                ? typeSiteParMassif.get(plante.massif) ?? "exterieur"
                : "exterieur",
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

        bilan_hydrique: 0,
        bilan_hydrique_date: aujourdHui,
        derniere_verification_humidite: aujourdHui,
        dernier_etat_humidite: "sec",
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

    const { data: planteVerification } = await supabase
      .from("plantes")
      .select("massif")
      .eq("id", planteId)
      .eq("user_id", userId)
      .maybeSingle();

    let siteInterieur = false;

    if (planteVerification?.massif) {
      const { data: siteVerification } = await supabase
        .from("massifs")
        .select("type_site")
        .eq("user_id", userId)
        .eq("nom", planteVerification.massif)
        .maybeSingle();

      siteInterieur = siteVerification?.type_site === "interieur";
    }

    const bilanAvenir = siteInterieur
      ? null
      : calculerBilanClimatique24hAvenir();

    const delaiVerification =
      !siteInterieur &&
      bilanAvenir !== null &&
      bilanAvenir > 0
        ? 1
        : 2;

    const prochaineVerification =
      ajouterJours(
        maintenant,
        delaiVerification
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
          siteInterieur
            ? "Le substrat était encore humide. La météo extérieure n’intervient pas pour cette plante intérieure. Nouvelle vérification dans deux jours."
            : delaiVerification === 1
              ? "La terre était encore humide, mais les prochaines 24 h sont asséchantes. Nouvelle vérification demain."
              : "La terre était encore humide. Nouvelle vérification dans deux jours.",

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

  async function programmerProchainesTailles(
    planteId: number,
    userId: string
  ) {
    const {
      data: periodes,
      error: erreurPeriodes,
    } = await supabase
      .from("periodes_taille")
      .select(
        "id, mois_debut, mois_fin, libelle, type_taille"
      )
      .eq("plante_id", planteId)
      .order("mois_debut", {
        ascending: true,
      });

    if (erreurPeriodes) {
      console.error(
        "Erreur récupération périodes de taille :",
        erreurPeriodes
      );

      return false;
    }

    if (!periodes || periodes.length === 0) {
      return true;
    }

    const {
      data: tachesExistantes,
      error: erreurTachesExistantes,
    } = await supabase
      .from("taches")
      .select(
        "id, date_prevue, detail, terminee"
      )
      .eq("user_id", userId)
      .eq("plante_id", planteId)
      .eq("type_tache", "taille")
      .eq("terminee", false);

    if (erreurTachesExistantes) {
      console.error(
        "Erreur récupération tâches de taille existantes :",
        erreurTachesExistantes
      );

      return false;
    }

    const aujourdHui = new Date();
    aujourdHui.setHours(12, 0, 0, 0);

    const moisActuel =
      aujourdHui.getMonth() + 1;

    const anneeActuelle =
      aujourdHui.getFullYear();

    function dateTexte(
      date: Date
    ) {
      const annee =
        date.getFullYear();

      const mois = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const jour = String(
        date.getDate()
      ).padStart(2, "0");

      return `${annee}-${mois}-${jour}`;
    }

    function prochaineDate(
      moisDebut: number,
      moisFin: number
    ) {
      if (
        !Number.isInteger(moisDebut) ||
        !Number.isInteger(moisFin) ||
        moisDebut < 1 ||
        moisDebut > 12 ||
        moisFin < 1 ||
        moisFin > 12
      ) {
        return null;
      }

      const traverseNouvelAn =
        moisDebut > moisFin;

      let anneeCible =
        anneeActuelle;

      if (!traverseNouvelAn) {
        if (moisActuel > moisFin) {
          anneeCible += 1;
        } else if (
          moisActuel >= moisDebut &&
          moisActuel <= moisFin
        ) {
          // Une taille vient d'être validée pendant
          // sa fenêtre : prochaine occurrence l'année suivante.
          anneeCible += 1;
        }
      } else {
        const dansPeriode =
          moisActuel >= moisDebut ||
          moisActuel <= moisFin;

        if (dansPeriode) {
          anneeCible += 1;
        }
      }

      const date = new Date(
        anneeCible,
        moisDebut - 1,
        1,
        12,
        0,
        0,
        0
      );

      if (
        date.getTime() <=
        aujourdHui.getTime()
      ) {
        date.setFullYear(
          date.getFullYear() + 1
        );
      }

      return date;
    }

    for (const periode of periodes) {
      const date =
        prochaineDate(
          Number(periode.mois_debut),
          Number(periode.mois_fin)
        );

      if (!date) {
        continue;
      }

      const datePrevue =
        dateTexte(date);

      const detail =
        periode.libelle
          ? `Période conseillée : ${periode.libelle}`
          : "Taille conseillée par Feuillia.";

      const existeDeja =
        (tachesExistantes ?? []).some(
          (tache) =>
            tache.date_prevue ===
              datePrevue &&
            tache.detail ===
              detail
        );

      if (existeDeja) {
        continue;
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
            "taille",

          titre:
            "Tailler",

          detail,

          date_prevue:
            datePrevue,

          terminee:
            false,
        });

      if (erreurNouvelleTache) {
        console.error(
          "Erreur création prochaine tâche de taille :",
          erreurNouvelleTache
        );

        return false;
      }
    }

    return true;
  }

  async function programmerProchaineFertilisation(
    tache: Tache,
    userId: string
  ) {
    if (!tache.periode_fertilisation_id) {
      return true;
    }

    const {
      data: periode,
      error: erreurPeriode,
    } = await supabase
      .from("periodes_fertilisation")
      .select(
        "id, mois_debut, mois_fin, libelle, type_engrais, forme_engrais, dosage, intervalle_jours"
      )
      .eq("id", tache.periode_fertilisation_id)
      .eq("plante_id", tache.plante_id)
      .maybeSingle();

    if (erreurPeriode) {
      console.error(
        "Erreur récupération période de fertilisation :",
        erreurPeriode
      );
      return false;
    }

    if (!periode) {
      return true;
    }

    const moisDebut = Number(periode.mois_debut);
    const moisFin = Number(periode.mois_fin);
    const intervalle =
      periode.intervalle_jours === null ||
      periode.intervalle_jours === undefined
        ? null
        : Number(periode.intervalle_jours);

    const periodeValide =
      Number.isInteger(moisDebut) &&
      Number.isInteger(moisFin) &&
      moisDebut >= 1 &&
      moisDebut <= 12 &&
      moisFin >= 1 &&
      moisFin <= 12;

    if (!periodeValide) {
      return false;
    }

    const maintenant = new Date();
    maintenant.setHours(12, 0, 0, 0);

    function dateDansPeriode(
      date: Date,
      debut: number,
      fin: number
    ) {
      const mois = date.getMonth() + 1;

      if (debut <= fin) {
        return mois >= debut && mois <= fin;
      }

      return mois >= debut || mois <= fin;
    }

    function dateDebutProchainePeriode(
      debut: number,
      fin: number
    ) {
      const annee = maintenant.getFullYear();
      const moisActuel = maintenant.getMonth() + 1;
      const traverseNouvelAn = debut > fin;

      let anneeCible = annee;

      if (!traverseNouvelAn) {
        if (moisActuel >= debut) {
          anneeCible += 1;
        }
      } else {
        const dansPeriode =
          moisActuel >= debut || moisActuel <= fin;

        if (dansPeriode) {
          if (moisActuel >= debut) {
            anneeCible += 1;
          }
        } else if (moisActuel > fin && moisActuel < debut) {
          anneeCible = annee;
        }
      }

      return new Date(
        anneeCible,
        debut - 1,
        1,
        12,
        0,
        0,
        0
      );
    }

    let prochaineDate: Date;

    if (
      intervalle !== null &&
      Number.isFinite(intervalle) &&
      intervalle > 0
    ) {
      const candidate = ajouterJours(
        maintenant,
        intervalle
      );

      prochaineDate = dateDansPeriode(
        candidate,
        moisDebut,
        moisFin
      )
        ? candidate
        : dateDebutProchainePeriode(
            moisDebut,
            moisFin
          );
    } else {
      prochaineDate = dateDebutProchainePeriode(
        moisDebut,
        moisFin
      );
    }

    const prochaineDateTexte =
      prochaineDate.toLocaleDateString("en-CA");

    const { data: tacheExistante, error: erreurDoublon } =
      await supabase
        .from("taches")
        .select("id")
        .eq("user_id", userId)
        .eq("plante_id", tache.plante_id)
        .eq(
          "periode_fertilisation_id",
          tache.periode_fertilisation_id
        )
        .eq("type_tache", "fertilisation")
        .eq("terminee", false)
        .eq("date_prevue", prochaineDateTexte)
        .maybeSingle();

    if (erreurDoublon) {
      console.error(
        "Erreur vérification doublon fertilisation :",
        erreurDoublon
      );
      return false;
    }

    if (tacheExistante) {
      return true;
    }

    const detail = [
      periode.libelle
        ? `Période : ${periode.libelle}`
        : null,
      periode.type_engrais
        ? `Engrais : ${periode.type_engrais}`
        : null,
      periode.forme_engrais
        ? `Forme : ${periode.forme_engrais}`
        : null,
      periode.dosage
        ? `Dosage : ${periode.dosage}`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    const { error: erreurNouvelleTache } =
      await supabase
        .from("taches")
        .insert({
          user_id: userId,
          plante_id: tache.plante_id,
          periode_fertilisation_id:
            tache.periode_fertilisation_id,
          type_tache: "fertilisation",
          titre: "Fertiliser",
          detail:
            detail ||
            "Apport nutritif conseillé par Feuillia.",
          date_prevue: prochaineDateTexte,
          terminee: false,
        });

    if (erreurNouvelleTache) {
      console.error(
        "Erreur création prochaine fertilisation :",
        erreurNouvelleTache
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

    const estUneTaille =
      tache.type_tache
        .toLowerCase()
        .includes("tail");

    if (estUneTaille) {
      await programmerProchainesTailles(
        tache.plante_id,
        user.id
      );
    }

    const estUneFertilisation =
      tache.type_tache
        .toLowerCase()
        .includes("fertil");

    if (estUneFertilisation) {
      await programmerProchaineFertilisation(
        tache,
        user.id
      );
    }

    retirerTacheDeLaListe(
      tacheId
    );
  }

  async function enregistrerObservationHumidite(
    planteId: number,
    userId: string,
    etat: "sec" | "humide"
  ) {
    const aujourdHui = dateAujourdhui();

    const { data: plante, error } = await supabase
      .from("plantes")
      .select("bilan_hydrique")
      .eq("id", planteId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error(
        "Erreur lecture bilan avant observation :",
        error
      );
      return false;
    }

    const bilan = Number(plante?.bilan_hydrique ?? 0);

    const miseAJour: {
      derniere_verification_humidite: string;
      dernier_etat_humidite: string;
      seuil_secheresse_appris?: number;
    } = {
      derniere_verification_humidite: aujourdHui,
      dernier_etat_humidite: etat,
    };

    if (
      etat === "sec" &&
      Number.isFinite(bilan) &&
      bilan > 0
    ) {
      miseAJour.seuil_secheresse_appris = Number(
        bilan.toFixed(1)
      );
    }

    const { error: erreurMiseAJour } =
      await supabase
        .from("plantes")
        .update(miseAJour)
        .eq("id", planteId)
        .eq("user_id", userId);

    if (erreurMiseAJour) {
      console.error(
        "Erreur enregistrement observation humidité :",
        erreurMiseAJour
      );
      return false;
    }

    return true;
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

    await enregistrerObservationHumidite(
      tache.plante_id,
      user.id,
      "sec"
    );

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

    await enregistrerObservationHumidite(
      tache.plante_id,
      user.id,
      "humide"
    );

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

  const tachesIntelligentes = taches.map(
    rendreTacheIntelligente
  );

  const groupes = tachesIntelligentes.reduce(
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
              {tachesIntelligentes.length === 0
                ? "Aucune tâche d’entretien prévue aujourd’hui"
                : `${tachesIntelligentes.length} ${
                    tachesIntelligentes.length > 1
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
                  <div>
                    <p className="text-xs text-gray-400">
                      Maximum
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {Math.round(meteo.temperatureMax)}°
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-gray-400">
                      Minimum
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {Math.round(meteo.temperatureMin)}°
                    </p>
                  </div>
                </div>
              </div>

              {(meteo.precipitationActuelle > 0 ||
                meteo.pluieActuelle > 0) && (
                <div className="mt-4 rounded-2xl bg-[#EEF5E9] px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <CloudRain
                      size={18}
                      className="shrink-0 text-[#5BA651]"
                    />
                    <p className="text-xs font-medium text-gray-500">
                      Pluie actuelle
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    Il pleut actuellement
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#EEF5E9] px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <CloudRain
                      size={18}
                      className="shrink-0 text-[#5BA651]"
                    />
                    <p className="text-xs font-medium text-gray-500">
                      Pluie 24 h passées
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
                      Pluie 24 h à venir
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    {meteo.pluieProchaines24h.toFixed(1)} mm
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-[#EEF5E9] px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Wind
                      size={18}
                      className="shrink-0 text-[#1B4332]"
                    />
                    <p className="text-xs font-medium text-gray-500">
                      Vent actuel
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    {meteo.vitesseVentActuelle.toFixed(1)} km/h
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {messageMeteoUtilisateur()}
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 text-gray-500">
              {erreurMeteo}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-[26px] border border-sky-100 bg-white p-5 shadow-sm" aria-live="polite" aria-busy={chargementFroid}>
          <h2 className="text-lg font-semibold">Surveillance du froid</h2>
          {afficherOutilsFroid && <div className="mt-3 rounded-2xl bg-[#EEF5E9] p-3">
            <button type="button" onClick={() => { void completerDonneesFroid(); }} disabled={completionFroid}
              className="w-full rounded-xl bg-[#1B4332] px-4 py-3 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60">
              {completionFroid ? "Complétion en cours…" : "Compléter les données froid manquantes"}
            </button>
            <p className="mt-2 text-xs leading-5 text-gray-600">Plantes extérieures uniquement. Utilise votre API OpenAI. Gardez cette page ouverte jusqu’à la fin. Les champs déjà renseignés sont conservés.</p>
            {progressionFroid && <p className="mt-2 text-sm" role="status">{progressionFroid}</p>}
            {resultatsCompletionFroid.length > 0 && <details className="mt-2 text-sm" open>
              <summary className="cursor-pointer font-medium">Résultats par plante</summary>
              <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                {resultatsCompletionFroid.map((ligne, index) => <li key={index}>{ligne}</li>)}
              </ul>
            </details>}
            {diagnosticsFroid.length > 0 && <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">Fiches à vérifier ({diagnosticsFroid.length})</summary>
              <ul className="mt-2 space-y-2">
                {diagnosticsFroid.map((ligne, index) => <li key={index}>{ligne}</li>)}
              </ul>
            </details>}
          </div>}
          {chargementFroid ? (
            <p className="mt-2 text-sm text-gray-600">Vérification des prochaines 24 heures…</p>
          ) : erreurFroid ? (
            <p className="mt-2 text-sm text-amber-800">{erreurFroid}</p>
          ) : meteoFroid ? (
            <>
              <p className="mt-2 text-sm text-gray-600">
                Minimum prévu : <strong>{meteoFroid.temperatureMinProchaines24h?.toLocaleString("fr-FR")} °C</strong>
                {" — "}{afficherHeureFroid(meteoFroid.heureTemperatureMinProchaines24h, meteoFroid.timezone)}
                {" (heure du jardin)."}
              </p>
              {alertesFroid.length === 0 ? (
                <p className="mt-3 text-sm text-[#5BA651]">Aucun seuil de vigilance atteint pour les plantes évaluées.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {alertesFroid.map(alerte => (
                    <article key={alerte.plante.id} className={`rounded-2xl border p-4 ${alerte.danger ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className={`text-xs font-semibold ${alerte.danger ? "text-red-800" : "text-amber-800"}`}>
                        {alerte.danger ? "Risque de dommages — protection à prévoir" : "Vigilance froid — anticiper la protection"}
                      </p>
                      <h3 className="mt-1 font-semibold">{alerte.plante.nom_commun}</h3>
                      <p className="mt-1 text-xs text-gray-600">{alerte.plante.massif}</p>
                      <p className="mt-2 text-sm">Seuil de vigilance : {alerte.seuil.toLocaleString("fr-FR")} °C.
                        {alerte.minimumTolere !== null && ` Minimum toléré indicatif : ${alerte.minimumTolere.toLocaleString("fr-FR")} °C.`}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6">
                        {alerte.plante.protection_froid?.trim() || "Consigne de protection manquante : consultez la fiche de cette plante pour préparer une protection adaptée."}
                      </p>
                    </article>
                  ))}
                </div>
              )}
              {plantesFroidNonEvaluees > 0 && (
                <p className="mt-3 text-sm text-amber-800">
                  {plantesFroidNonEvaluees} plante(s) non évaluée(s) : vérifiez le type du site et les seuils froid de leur fiche.
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-gray-500">Prévisions indicatives pour la localisation du jardin. Actualisation toutes les 15 minutes tant que cette page reste ouverte. Pas de notification téléphone à cette étape.</p>
            </>
          ) : null}
        </section>

        {chargement ? (
          <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Chargement...
            </p>
          </div>
        ) : tachesIntelligentes.length === 0 ? (
          <section className="mt-8 rounded-3xl bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5E9]">
              <Check
                size={28}
                className="text-[#5BA651]"
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              Aucune tâche d’entretien
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

                    {tachesMassif[0]?.plante?.type_site === "interieur" ? (
                      <span className="rounded-full bg-[#EEF5E9] px-2.5 py-1 text-[10px] font-medium text-[#5BA651]">
                        🏠 Intérieur
                      </span>
                    ) : tachesMassif[0]?.plante?.exposition_pluie ? (
                      <span className="rounded-full bg-[#EEF5E9] px-2.5 py-1 text-[10px] font-medium text-[#5BA651]">
                        {tachesMassif[0].plante.exposition_pluie ===
                        "ciel_ouvert"
                          ? "🌧️ Ciel ouvert"
                          : tachesMassif[0].plante.exposition_pluie ===
                            "partiellement_couvert"
                          ? "🌦️ Partiellement couvert"
                          : "🏠 Sous toit"}
                      </span>
                    ) : null}
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
