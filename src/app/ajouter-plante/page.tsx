"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned, Search } from "lucide-react";
import { supabase } from "../lib/supabase";

type ResultatIdentification = {
  nomCommun: string;
  nomBotanique: string;
  confiance: string;
};

type ResultatRecherche = {
  nomCommun: string;
  nomBotanique: string;
  precision: string;
};

type ConseilsPlante = {
  arrosage: string;
  arrosage_intervalle_jours: number;
  lumiere: string;
  temperature: string;
  temperature_min_toleree: number;
  seuil_vigilance_froid: number;
  protection_froid: string;
  substrat_conseille: string;
  drainage: "faible" | "moyen" | "fort";
  periode_taille: string;
  periodes_taille: {
    mois_debut: number;
    mois_fin: number;
    libelle: string;
    type_taille: string;
  }[];
  pourquoi_taille: string;
  comment_tailler: string;
  intensite_taille: string;
  precautions_taille: string;

  branches_a_couper: string;
  emplacement_coupe: string;
  quantite_a_retirer: string;
  elements_a_conserver: string;
  taille_jeune_adulte: string;
  ordre_priorites_taille: string;
  outils_taille: string;
  apres_taille: string;

  periodes_fertilisation: {
    mois_debut: number;
    mois_fin: number;
    libelle: string;
    type_apport: string;
    type_engrais: string;
    forme_engrais: string;
    dosage: string;
    methode_application: string;
    frequence: string;
    intervalle_jours: number | null;
    duree_action: string;
    precautions: string;
  }[];

  conseil_entretien: string;
};

type DernierArrosage =
  | "aujourdhui"
  | "hier"
  | "3-4-jours"
  | "1-semaine"
  | "2-semaines"
  | "inconnu"
  | "";

type ModeCulture = "pleine_terre" | "pot_bac" | "";

type PotMatiere =
  | "terre_cuite"
  | "plastique_resine"
  | "ceramique_emaillee"
  | "bois"
  | "metal"
  | "autre"
  | "inconnu"
  | "";

type TrousDrainage = "oui" | "non" | "inconnu" | "";

type OrientationFenetre =
  | "nord"
  | "nord_est"
  | "est"
  | "sud_est"
  | "sud"
  | "sud_ouest"
  | "ouest"
  | "nord_ouest"
  | "inconnu"
  | "";

type LuminositePiece =
  | "lumineuse"
  | "moyenne"
  | "sombre"
  | "inconnu"
  | "";

type TypeLumiereInterieur =
  | "directe"
  | "indirecte"
  | "mixte"
  | "inconnu"
  | "";

export default function AjouterPlantePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [fichierPhoto, setFichierPhoto] = useState<File | null>(null);

  const [resultat, setResultat] =
    useState<ResultatIdentification | null>(null);

  const [chargement, setChargement] = useState(false);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  const [massifs, setMassifs] = useState<
    { nom: string; type_site: "exterieur" | "interieur" | null }[]
  >([]);
  const [massifSelectionne, setMassifSelectionne] = useState("");

  const [modeCulture, setModeCulture] =
    useState<ModeCulture>("");

  const [potDiametreCm, setPotDiametreCm] = useState("");
  const [potHauteurCm, setPotHauteurCm] = useState("");
  const [potVolumeLitres, setPotVolumeLitres] = useState("");
  const [potMatiere, setPotMatiere] =
    useState<PotMatiere>("");
  const [potTrousDrainage, setPotTrousDrainage] =
    useState<TrousDrainage>("");

  const [distanceFenetreM, setDistanceFenetreM] =
    useState("");
  const [orientationFenetre, setOrientationFenetre] =
    useState<OrientationFenetre>("");
  const [luminositePiece, setLuminositePiece] =
    useState<LuminositePiece>("");
  const [typeLumiereInterieur, setTypeLumiereInterieur] =
    useState<TypeLumiereInterieur>("");
  const [obstacleLumiere, setObstacleLumiere] =
    useState("");

  const siteSelectionne =
    massifs.find((site) => site.nom === massifSelectionne) ?? null;

  const siteInterieur =
    siteSelectionne?.type_site === "interieur";

  const [dernierArrosage, setDernierArrosage] =
    useState<DernierArrosage>("");

  const [texteRecherche, setTexteRecherche] = useState("");
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [resultatsRecherche, setResultatsRecherche] = useState<
    ResultatRecherche[]
  >([]);

  useEffect(() => {
    async function chargerMassifs() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("massifs")
        .select("nom, type_site")
        .eq("user_id", user.id)
        .order("nom", {
          ascending: true,
        });

      if (error) {
        console.error("Erreur chargement massifs :", error);
        return;
      }

      const sites = (data ?? [])
        .filter(
          (item) =>
            typeof item.nom === "string" &&
            item.nom.trim() !== ""
        )
        .map((item) => ({
          nom: item.nom as string,
          type_site:
            item.type_site === "interieur" || item.type_site === "exterieur"
              ? item.type_site
              : null,
        }));

      setMassifs(sites);
    }

    chargerMassifs();
  }, []);

  function ouvrirAppareilPhoto() {
    fileInputRef.current?.click();
  }

  function choisirPhoto(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const fichier = event.target.files?.[0];

    if (!fichier) return;

    setFichierPhoto(fichier);

    const url = URL.createObjectURL(fichier);

    setPhoto(url);
    setResultat(null);
    setResultatsRecherche([]);
  }

  async function identifierPlante() {
    if (!fichierPhoto) return;

    setChargement(true);
    setResultat(null);

    try {
      const formData = new FormData();

      formData.append("photo", fichierPhoto);

      const response = await fetch(
        "/api/identifier-plante",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur identification :", data);

        alert(
          "Impossible d'identifier cette plante."
        );

        return;
      }

      setResultat(data);
    } catch (error) {
      console.error("Erreur identification :", error);

      alert(
        "Une erreur est survenue pendant l'identification."
      );
    } finally {
      setChargement(false);
    }
  }

  async function rechercherPlante() {
    const recherche = texteRecherche.trim();

    if (recherche.length < 2) {
      alert(
        "Écrivez au moins 2 lettres pour rechercher une plante."
      );
      return;
    }

    setRechercheEnCours(true);
    setResultatsRecherche([]);

    try {
      const response = await fetch(
        "/api/rechercher-plante",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recherche,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Erreur recherche plante :",
          data
        );

        alert(
          data?.erreur ||
            "Impossible de rechercher cette plante."
        );

        return;
      }

      setResultatsRecherche(
        Array.isArray(data.resultats)
          ? data.resultats
          : []
      );
    } catch (error) {
      console.error(
        "Erreur recherche plante :",
        error
      );

      alert(
        "Une erreur est survenue pendant la recherche."
      );
    } finally {
      setRechercheEnCours(false);
    }
  }

  function choisirResultatRecherche(
    plante: ResultatRecherche
  ) {
    setResultat({
      nomCommun: plante.nomCommun,
      nomBotanique: plante.nomBotanique,
      confiance: "Recherche manuelle",
    });

    setPhoto(null);
    setFichierPhoto(null);
    setResultatsRecherche([]);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function nombreOuNull(valeur: string): number | null {
    const texte = valeur.trim().replace(",", ".");

    if (texte === "") {
      return null;
    }

    const nombre = Number(texte);

    return Number.isFinite(nombre) ? nombre : null;
  }

  async function genererConseils(
    nomCommun: string,
    nomBotanique: string
  ): Promise<ConseilsPlante> {
    const response = await fetch(
      "/api/conseils-plante",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nomCommun,
          nomBotanique,
          contexteCulture: {
            modeCulture,
            typeSite: siteSelectionne?.type_site ?? null,
            siteNom: massifSelectionne.trim() || null,

            pot:
              modeCulture === "pot_bac"
                ? {
                    diametreCm: nombreOuNull(potDiametreCm),
                    hauteurCm: nombreOuNull(potHauteurCm),
                    volumeLitres: nombreOuNull(potVolumeLitres),
                    matiere: potMatiere || null,
                    trousDrainage:
                      potTrousDrainage === "oui"
                        ? true
                        : potTrousDrainage === "non"
                          ? false
                          : null,
                  }
                : null,

            interieur:
              siteInterieur && modeCulture === "pot_bac"
                ? {
                    distanceFenetreM: nombreOuNull(distanceFenetreM),
                    orientationFenetre: orientationFenetre || null,
                    luminositePiece: luminositePiece || null,
                    typeLumiere: typeLumiereInterieur || null,
                    obstacleLumiere: obstacleLumiere.trim() || null,
                  }
                : null,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erreur génération conseils :",
        data
      );

      throw new Error(
        data?.erreur ||
          "Impossible de générer les conseils."
      );
    }

    return data as ConseilsPlante;
  }

  function dateLocale(date: Date) {
    const annee = date.getFullYear();

    const mois = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const jour = String(
      date.getDate()
    ).padStart(2, "0");

    return `${annee}-${mois}-${jour}`;
  }

  function calculerDerniereDateArrosage(
    choix: DernierArrosage
  ) {
    if (
      choix === "" ||
      choix === "inconnu"
    ) {
      return null;
    }

    const date = new Date();

    date.setHours(12, 0, 0, 0);

    if (choix === "hier") {
      date.setDate(date.getDate() - 1);
    }

    if (choix === "3-4-jours") {
      date.setDate(date.getDate() - 4);
    }

    if (choix === "1-semaine") {
      date.setDate(date.getDate() - 7);
    }

    if (choix === "2-semaines") {
      date.setDate(date.getDate() - 14);
    }

    return date;
  }

  function calculerProchaineDateArrosage(
    derniereDate: Date,
    intervalle: number
  ) {
    const prochaineDate = new Date(
      derniereDate
    );

    prochaineDate.setDate(
      prochaineDate.getDate() + intervalle
    );

    prochaineDate.setHours(12, 0, 0, 0);

    const aujourdHui = new Date();

    aujourdHui.setHours(12, 0, 0, 0);

    if (
      prochaineDate.getTime() <
      aujourdHui.getTime()
    ) {
      return aujourdHui;
    }

    return prochaineDate;
  }


  async function ajouterAuxPlantes() {
    if (!resultat) return;

    if (!modeCulture) {
      alert(
        "Indiquez si la plante est en pleine terre ou en pot / bac."
      );
      return;
    }

    if (
      modeCulture === "pot_bac" &&
      !potMatiere
    ) {
      alert(
        "Indiquez la matière du pot ou choisissez « Je ne sais pas »."
      );
      return;
    }

    if (
      modeCulture === "pot_bac" &&
      !potTrousDrainage
    ) {
      alert(
        "Indiquez si le pot possède des trous de drainage."
      );
      return;
    }

    if (siteInterieur && modeCulture === "pot_bac") {
      if (!orientationFenetre) {
        alert(
          "Indiquez l’orientation de la fenêtre ou choisissez « Je ne sais pas »."
        );
        return;
      }

      if (!luminositePiece) {
        alert(
          "Indiquez la luminosité de la pièce."
        );
        return;
      }

      if (!typeLumiereInterieur) {
        alert(
          "Indiquez le type de lumière reçu par la plante."
        );
        return;
      }
    }

    const massifFinal =
      massifSelectionne.trim();

    if (!massifFinal) {
      alert(
        "Choisissez un site existant."
      );
      return;
    }

    if (!dernierArrosage) {
      alert(
        "Indiquez quand cette plante a été arrosée pour la dernière fois."
      );
      return;
    }

    setAjoutEnCours(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          "Vous devez être connecté pour ajouter une plante."
        );
        return;
      }

      const conseils = await genererConseils(
        resultat.nomCommun,
        resultat.nomBotanique
      );

      const intervalleArrosage =
        conseils.arrosage_intervalle_jours;

      const derniereDateArrosage =
        calculerDerniereDateArrosage(
          dernierArrosage
        );

      const prochaineDateArrosage =
        derniereDateArrosage
          ? calculerProchaineDateArrosage(
              derniereDateArrosage,
              intervalleArrosage
            )
          : null;

      let photoUrl: string | null = null;

      if (fichierPhoto) {
        const extension =
          fichierPhoto.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const nomFichier =
          `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const cheminPhoto =
          `${user.id}/${nomFichier}`;

        const { error: erreurUpload } =
          await supabase.storage
            .from("photos-plantes")
            .upload(
              cheminPhoto,
              fichierPhoto,
              {
                cacheControl: "3600",
                upsert: false,
                contentType:
                  fichierPhoto.type,
              }
            );

        if (erreurUpload) {
          console.error(
            "Erreur upload photo :",
            erreurUpload
          );

          alert(
            "Impossible d'enregistrer la photo : " +
              erreurUpload.message
          );

          return;
        }

        const {
          data: donneesPhoto,
        } = supabase.storage
          .from("photos-plantes")
          .getPublicUrl(cheminPhoto);

        photoUrl =
          donneesPhoto.publicUrl;
      }

      const {
        data: planteCreee,
        error: erreurPlante,
      } = await supabase
        .from("plantes")
        .insert({
          nom_commun:
            resultat.nomCommun,

          nom_botanique:
            resultat.nomBotanique,

          confiance:
            resultat.confiance,

          photo_url:
            photoUrl,

          massif:
            massifFinal,

          user_id:
            user.id,

          mode_culture:
            modeCulture,

          pot_diametre_cm:
            modeCulture === "pleine_terre"
              ? null
              : nombreOuNull(potDiametreCm),

          pot_hauteur_cm:
            modeCulture === "pleine_terre"
              ? null
              : nombreOuNull(potHauteurCm),

          pot_volume_litres:
            modeCulture === "pleine_terre"
              ? null
              : nombreOuNull(potVolumeLitres),

          pot_matiere:
            modeCulture === "pleine_terre"
              ? null
              : potMatiere || null,

          pot_trous_drainage:
            modeCulture === "pleine_terre"
              ? null
              : potTrousDrainage === "oui"
                ? true
                : potTrousDrainage === "non"
                  ? false
                  : null,

          distance_fenetre_m:
            siteInterieur && modeCulture === "pot_bac"
              ? nombreOuNull(distanceFenetreM)
              : null,

          orientation_fenetre:
            siteInterieur && modeCulture === "pot_bac"
              ? orientationFenetre || null
              : null,

          luminosite_piece:
            siteInterieur && modeCulture === "pot_bac"
              ? luminositePiece || null
              : null,

          type_lumiere_interieur:
            siteInterieur && modeCulture === "pot_bac"
              ? typeLumiereInterieur || null
              : null,

          obstacle_lumiere:
            siteInterieur && modeCulture === "pot_bac"
              ? obstacleLumiere.trim() || null
              : null,

          arrosage:
            conseils.arrosage,

          arrosage_intervalle_jours:
            intervalleArrosage,

          arrosage_derniere_date:
            derniereDateArrosage
              ? dateLocale(
                  derniereDateArrosage
                )
              : null,

          arrosage_prochaine_date:
            prochaineDateArrosage
              ? dateLocale(
                  prochaineDateArrosage
                )
              : null,

          lumiere:
            conseils.lumiere,

          temperature:
            conseils.temperature,

          temperature_min_toleree:
            conseils.temperature_min_toleree,

          seuil_vigilance_froid:
            conseils.seuil_vigilance_froid,

          protection_froid:
            conseils.protection_froid,

          substrat_conseille:
            conseils.substrat_conseille,

          drainage:
            conseils.drainage,

          periode_taille:
            conseils.periode_taille,

          pourquoi_taille:
            conseils.pourquoi_taille,

          comment_tailler:
            conseils.comment_tailler,

          intensite_taille:
            conseils.intensite_taille,

          precautions_taille:
            conseils.precautions_taille,

          branches_a_couper:
            conseils.branches_a_couper,

          emplacement_coupe:
            conseils.emplacement_coupe,

          quantite_a_retirer:
            conseils.quantite_a_retirer,

          elements_a_conserver:
            conseils.elements_a_conserver,

          taille_jeune_adulte:
            conseils.taille_jeune_adulte,

          ordre_priorites_taille:
            conseils.ordre_priorites_taille,

          outils_taille:
            conseils.outils_taille,

          apres_taille:
            conseils.apres_taille,

          conseil_entretien:
            conseils.conseil_entretien,
        })
        .select("id")
        .single();

      if (erreurPlante) {
        console.error(
          "Erreur ajout plante :",
          erreurPlante
        );

        alert(
          "Impossible d'ajouter la plante : " +
            erreurPlante.message
        );

        return;
      }

      if (!planteCreee) {
        throw new Error(
          "Impossible de récupérer la plante créée."
        );
      }

      if (dernierArrosage === "inconnu") {
        const aujourdHui =
          dateLocale(new Date());

        const {
          error: erreurTache,
        } = await supabase
          .from("taches")
          .insert({
            user_id:
              user.id,

            plante_id:
              planteCreee.id,

            type_tache:
              "verification_arrosage",

            titre:
              "Vérifier l’humidité de la terre",

            detail:
              "La date du dernier arrosage est inconnue. Vérifiez l’humidité de la terre avant d’arroser.",

            date_prevue:
              aujourdHui,

            terminee:
              false,
          });

        if (erreurTache) {
          console.error(
            "Erreur création tâche de vérification :",
            erreurTache
          );
        }
      } else if (prochaineDateArrosage) {
        const {
          error: erreurTache,
        } = await supabase
          .from("taches")
          .insert({
            user_id:
              user.id,

            plante_id:
              planteCreee.id,

            type_tache:
              "arrosage",

            titre:
              "Arroser",

            detail:
              "Arrosage conseillé par Feuillia.",

            date_prevue:
              dateLocale(
                prochaineDateArrosage
              ),

            terminee:
              false,
          });

        if (erreurTache) {
          console.error(
            "Erreur création tâche d'arrosage :",
            erreurTache
          );
        }
      }

      const periodesTaille =
        Array.isArray(conseils.periodes_taille)
          ? conseils.periodes_taille
          : [];

      function prochaineDatePourPeriode(
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

        const aujourdHui = new Date();
        aujourdHui.setHours(12, 0, 0, 0);

        const moisActuel =
          aujourdHui.getMonth() + 1;

        const anneeActuelle =
          aujourdHui.getFullYear();

        const traverseNouvelAn =
          moisDebut > moisFin;

        const dansPeriode =
          traverseNouvelAn
            ? moisActuel >= moisDebut ||
              moisActuel <= moisFin
            : moisActuel >= moisDebut &&
              moisActuel <= moisFin;

        if (dansPeriode) {
          return aujourdHui;
        }

        let anneeCible = anneeActuelle;

        if (!traverseNouvelAn) {
          if (moisActuel > moisFin) {
            anneeCible += 1;
          }
        } else {
          if (
            moisActuel <= moisFin
          ) {
            return aujourdHui;
          }

          if (
            moisActuel >= moisDebut
          ) {
            return aujourdHui;
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
          date.getTime() <
          aujourdHui.getTime()
        ) {
          date.setFullYear(
            date.getFullYear() + 1
          );
        }

        return date;
      }

      for (
        const periode of periodesTaille
      ) {
        const {
          error: erreurPeriodeTaille,
        } = await supabase
          .from("periodes_taille")
          .insert({
            plante_id:
              planteCreee.id,

            mois_debut:
              periode.mois_debut,

            mois_fin:
              periode.mois_fin,

            libelle:
              periode.libelle,

            type_taille:
              periode.type_taille,
          });

        if (erreurPeriodeTaille) {
          console.error(
            "Erreur création période de taille :",
            erreurPeriodeTaille
          );

          continue;
        }

        const prochaineDate =
          prochaineDatePourPeriode(
            periode.mois_debut,
            periode.mois_fin
          );

        if (!prochaineDate) {
          continue;
        }

        const {
          error: erreurTacheTaille,
        } = await supabase
          .from("taches")
          .insert({
            user_id:
              user.id,

            plante_id:
              planteCreee.id,

            type_tache:
              "taille",

            titre:
              "Tailler",

            detail:
              periode.libelle
                ? `Période conseillée : ${periode.libelle}`
                : conseils.periode_taille
                  ? `Période conseillée : ${conseils.periode_taille}`
                  : "Taille conseillée par Feuillia.",

            date_prevue:
              dateLocale(
                prochaineDate
              ),

            terminee:
              false,
          });

        if (erreurTacheTaille) {
          console.error(
            "Erreur création tâche de taille :",
            erreurTacheTaille
          );
        }
      }


      const periodesFertilisation =
        Array.isArray(
          conseils.periodes_fertilisation
        )
          ? conseils.periodes_fertilisation
          : [];

      for (
        const periode of periodesFertilisation
      ) {
        const {
          data: periodeFertilisationCreee,
          error:
            erreurPeriodeFertilisation,
        } = await supabase
          .from("periodes_fertilisation")
          .insert({
            plante_id:
              planteCreee.id,

            mois_debut:
              periode.mois_debut,

            mois_fin:
              periode.mois_fin,

            libelle:
              periode.libelle,

            type_apport:
              periode.type_apport,

            type_engrais:
              periode.type_engrais,

            forme_engrais:
              periode.forme_engrais,

            dosage:
              periode.dosage,

            methode_application:
              periode.methode_application,

            frequence:
              periode.frequence,

            intervalle_jours:
              periode.intervalle_jours,

            duree_action:
              periode.duree_action,

            precautions:
              periode.precautions,
          })
          .select("id")
          .single();

        if (
          erreurPeriodeFertilisation ||
          !periodeFertilisationCreee
        ) {
          console.error(
            "Erreur création période de fertilisation :",
            erreurPeriodeFertilisation
          );

          continue;
        }

        const prochaineDate =
          prochaineDatePourPeriode(
            periode.mois_debut,
            periode.mois_fin
          );

        if (!prochaineDate) {
          continue;
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

        const {
          error: erreurTacheFertilisation,
        } = await supabase
          .from("taches")
          .insert({
            user_id:
              user.id,

            plante_id:
              planteCreee.id,

            periode_fertilisation_id:
              periodeFertilisationCreee.id,

            type_tache:
              "fertilisation",

            titre:
              "Fertiliser",

            detail:
              detail ||
              "Apport nutritif conseillé par Feuillia.",

            date_prevue:
              dateLocale(
                prochaineDate
              ),

            terminee:
              false,
          });

        if (erreurTacheFertilisation) {
          console.error(
            "Erreur création tâche de fertilisation :",
            erreurTacheFertilisation
          );
        }
      }

      alert(
        "Plante ajoutée avec ses conseils 🌿"
      );

      window.location.href =
        "/mes-plantes";
    } catch (error) {
      console.error(
        "Erreur ajout plante :",
        error
      );

      alert(
        "Impossible de générer ou d'enregistrer les conseils de cette plante."
      );
    } finally {
      setAjoutEnCours(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6">
        <header className="pt-8">
          <a
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white text-xl"
          >
            ←
          </a>

          <p className="mt-8 text-sm font-medium text-[#5BA651]">
            Ajouter une plante
          </p>

          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Quelle est votre plante ?
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Prenez une photo pour l’identifier automatiquement,
            ou recherchez son nom manuellement.
          </p>
        </header>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {photo ? (
              <img
                src={photo}
                alt="Plante sélectionnée"
                className="h-56 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EEF5E9] text-5xl">
                📸
              </div>
            )}

            <h2 className="mt-5 text-xl font-semibold">
              {photo
                ? "Votre photo"
                : "Photographier ma plante"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {photo
                ? "Photo prête pour l’identification."
                : "Feuillia analysera la photo et vous proposera l’identification la plus probable."}
            </p>

            <button
              type="button"
              onClick={ouvrirAppareilPhoto}
              className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white"
            >
              {photo
                ? "Changer la photo"
                : "Prendre une photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={choisirPhoto}
              className="hidden"
            />

            {photo && (
              <button
                type="button"
                onClick={identifierPlante}
                disabled={chargement}
                className="mt-3 w-full rounded-2xl bg-[#5BA651] py-4 font-semibold text-white disabled:opacity-60"
              >
                {chargement
                  ? "Identification..."
                  : "Identifier cette plante"}
              </button>
            )}
          </div>
        </section>

        {resultat && (
          <>
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-[#5BA651]">
                Plante sélectionnée
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {resultat.nomCommun}
              </h2>

              <p className="mt-1 italic text-gray-500">
                {resultat.nomBotanique}
              </p>

              <p className="mt-4 text-sm text-gray-600">
                {resultat.confiance ===
                "Recherche manuelle"
                  ? "Sélectionnée par recherche manuelle"
                  : `Confiance : ${resultat.confiance}`}
              </p>
            </section>


            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-[#5BA651]">
                Mode de culture
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Comment cette plante est-elle cultivée ?
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Feuillia adaptera ensuite l’arrosage et les conseils à son environnement réel.
              </p>

              <div className="mt-5 grid gap-2">
                {[
                  {
                    valeur: "pleine_terre",
                    titre: "🌱 Pleine terre",
                    texte: "La plante pousse directement dans le sol.",
                  },
                  {
                    valeur: "pot_bac",
                    titre: "🪴 Pot ou bac",
                    texte: "Feuillia utilisera le site choisi pour savoir s’il est à l’intérieur ou à l’extérieur.",
                  },
                ].map((option) => (
                  <button
                    key={option.valeur}
                    type="button"
                    onClick={() =>
                      setModeCulture(
                        option.valeur as ModeCulture
                      )
                    }
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      modeCulture === option.valeur
                        ? "border-[#5BA651] bg-[#EEF5E9]"
                        : "border-[#DDE5D8] bg-[#F7F5EE]"
                    }`}
                  >
                    <p className="font-semibold text-[#1B4332]">
                      {option.titre}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      {option.texte}
                    </p>
                  </button>
                ))}
              </div>

              {modeCulture !== "" &&
                modeCulture === "pot_bac" && (
                  <div className="mt-6 border-t border-[#E5E9E1] pt-6">
                    <p className="text-sm font-medium text-[#5BA651]">
                      Le contenant
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      Quelques informations sur le pot
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Les dimensions sont facultatives. Renseignez ce que vous connaissez.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">
                          Diamètre (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={potDiametreCm}
                          onChange={(event) =>
                            setPotDiametreCm(event.target.value)
                          }
                          placeholder="Ex. 30"
                          className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Hauteur (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={potHauteurCm}
                          onChange={(event) =>
                            setPotHauteurCm(event.target.value)
                          }
                          placeholder="Ex. 28"
                          className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-sm font-medium">
                        Volume du pot (litres), si connu
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={potVolumeLitres}
                        onChange={(event) =>
                          setPotVolumeLitres(event.target.value)
                        }
                        placeholder="Ex. 20"
                        className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium">
                        Matière du pot
                      </label>
                      <select
                        value={potMatiere}
                        onChange={(event) =>
                          setPotMatiere(
                            event.target.value as PotMatiere
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                      >
                        <option value="">Sélectionner</option>
                        <option value="terre_cuite">Terre cuite</option>
                        <option value="plastique_resine">Plastique / résine</option>
                        <option value="ceramique_emaillee">Céramique émaillée</option>
                        <option value="bois">Bois</option>
                        <option value="metal">Métal</option>
                        <option value="autre">Autre</option>
                        <option value="inconnu">Je ne sais pas</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium">
                        Le pot possède-t-il des trous de drainage ?
                      </label>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          { valeur: "oui", texte: "Oui" },
                          { valeur: "non", texte: "Non" },
                          { valeur: "inconnu", texte: "Je ne sais pas" },
                        ].map((option) => (
                          <button
                            key={option.valeur}
                            type="button"
                            onClick={() =>
                              setPotTrousDrainage(
                                option.valeur as TrousDrainage
                              )
                            }
                            className={`rounded-2xl border px-3 py-3 text-sm ${
                              potTrousDrainage === option.valeur
                                ? "border-[#5BA651] bg-[#EEF5E9] font-medium"
                                : "border-[#DDE5D8] bg-[#F7F5EE] text-gray-600"
                            }`}
                          >
                            {option.texte}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {siteInterieur && modeCulture === "pot_bac" && (
                <div className="mt-6 border-t border-[#E5E9E1] pt-6">
                  <p className="text-sm font-medium text-[#5BA651]">
                    Lumière intérieure
                  </p>

                  <h3 className="mt-1 text-lg font-semibold">
                    Quelle lumière reçoit la plante ?
                  </h3>

                  <div className="mt-4">
                    <label className="text-sm font-medium">
                      Distance entre la plante et la fenêtre (m)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={distanceFenetreM}
                      onChange={(event) =>
                        setDistanceFenetreM(event.target.value)
                      }
                      placeholder="Ex. 1,5"
                      className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">
                      Orientation de la fenêtre
                    </label>
                    <select
                      value={orientationFenetre}
                      onChange={(event) =>
                        setOrientationFenetre(
                          event.target.value as OrientationFenetre
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                    >
                      <option value="">Sélectionner</option>
                      <option value="nord">Nord</option>
                      <option value="nord_est">Nord-est</option>
                      <option value="est">Est</option>
                      <option value="sud_est">Sud-est</option>
                      <option value="sud">Sud</option>
                      <option value="sud_ouest">Sud-ouest</option>
                      <option value="ouest">Ouest</option>
                      <option value="nord_ouest">Nord-ouest</option>
                      <option value="inconnu">Je ne sais pas</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">
                      Luminosité générale de la pièce
                    </label>
                    <select
                      value={luminositePiece}
                      onChange={(event) =>
                        setLuminositePiece(
                          event.target.value as LuminositePiece
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                    >
                      <option value="">Sélectionner</option>
                      <option value="lumineuse">Pièce lumineuse</option>
                      <option value="moyenne">Luminosité moyenne</option>
                      <option value="sombre">Pièce plutôt sombre</option>
                      <option value="inconnu">Je ne sais pas</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">
                      Lumière reçue par la plante
                    </label>
                    <select
                      value={typeLumiereInterieur}
                      onChange={(event) =>
                        setTypeLumiereInterieur(
                          event.target.value as TypeLumiereInterieur
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                    >
                      <option value="">Sélectionner</option>
                      <option value="directe">Soleil direct</option>
                      <option value="indirecte">Lumière indirecte</option>
                      <option value="mixte">Un peu des deux</option>
                      <option value="inconnu">Je ne sais pas</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">
                      Obstacle devant la lumière, si présent
                    </label>
                    <input
                      type="text"
                      value={obstacleLumiere}
                      onChange={(event) =>
                        setObstacleLumiere(event.target.value)
                      }
                      placeholder="Ex. voilage, store, arbre, immeuble..."
                      className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5E9]">
                  <MapPinned
                    size={22}
                    className="text-[#5BA651]"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#5BA651]">
                    Emplacement
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Où se trouve cette plante ?
                  </h2>
                </div>
              </div>

              {massifs.length > 0 ? (
                <div className="mt-5">
                  <label className="text-sm font-medium">
                    Choisir un site existant
                  </label>

                  <select
                    value={massifSelectionne}
                    onChange={(event) =>
                      setMassifSelectionne(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                  >
                    <option value="">
                      Sélectionner un site
                    </option>

                    {massifs.map((site) => (
                      <option
                        key={site.nom}
                        value={site.nom}
                      >
                        {site.nom}
                        {site.type_site === "interieur"
                          ? " — Intérieur"
                          : site.type_site === "exterieur"
                            ? " — Extérieur"
                            : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-[#FFF7DE] p-4 text-sm leading-6 text-[#725B1D]">
                  Vous n’avez encore aucun site enregistré.
                </div>
              )}

              <a
                href="/ajouter-massif"
                className="mt-4 flex w-full items-center justify-center rounded-2xl border border-[#A7D08C] bg-[#EEF5E9] px-4 py-3 text-sm font-semibold text-[#1B4332]"
              >
                + Ajouter un nouveau site
              </a>

              <div className="mt-6 border-t border-[#E5E9E1] pt-6">
                <p className="text-sm font-medium text-[#5BA651]">
                  Arrosage
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Quand l’avez-vous arrosée pour la dernière fois ?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Cette information permet à Feuillia de préparer votre premier rappel.
                </p>

                <div className="mt-4 grid gap-2">
                  {[
                    {
                      valeur: "aujourdhui",
                      texte: "Aujourd’hui",
                    },
                    {
                      valeur: "hier",
                      texte: "Hier",
                    },
                    {
                      valeur: "3-4-jours",
                      texte: "Il y a 3–4 jours",
                    },
                    {
                      valeur: "1-semaine",
                      texte: "Environ 1 semaine",
                    },
                    {
                      valeur: "2-semaines",
                      texte: "2 semaines ou plus",
                    },
                    {
                      valeur: "inconnu",
                      texte: "Je ne sais pas",
                    },
                  ].map((option) => (
                    <button
                      key={option.valeur}
                      type="button"
                      onClick={() =>
                        setDernierArrosage(
                          option.valeur as DernierArrosage
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        dernierArrosage ===
                        option.valeur
                          ? "border-[#5BA651] bg-[#EEF5E9] font-medium text-[#1B4332]"
                          : "border-[#DDE5D8] bg-[#F7F5EE] text-gray-600"
                      }`}
                    >
                      {option.texte}
                    </button>
                  ))}
                </div>

                {dernierArrosage ===
                  "inconnu" && (
                  <div className="mt-4 rounded-2xl bg-[#FFF7DE] p-4 text-sm leading-6 text-[#725B1D]">
                    Feuillia vous proposera d’abord de vérifier
                    l’humidité de la terre avant de conseiller un
                    arrosage.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={ajouterAuxPlantes}
                disabled={ajoutEnCours}
                className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white disabled:opacity-60"
              >
                {ajoutEnCours
                  ? "Création de la fiche..."
                  : "🌿 Ajouter à mes plantes"}
              </button>
            </section>
          </>
        )}

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#DDE5D8]" />

          <span className="text-sm text-gray-400">
            ou
          </span>

          <div className="h-px flex-1 bg-[#DDE5D8]" />
        </div>

        <div className="flex w-full items-center gap-2 rounded-2xl border-2 border-[#5BA651] bg-[#F7F5EE] p-2">
          <Search
            size={19}
            className="ml-2 shrink-0 text-[#1B4332]"
          />

          <input
            type="text"
            value={texteRecherche}
            onChange={(event) =>
              setTexteRecherche(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                rechercherPlante();
              }
            }}
            placeholder="Rechercher une plante"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-[#1B4332]"
          />

          <button
            type="button"
            onClick={rechercherPlante}
            disabled={rechercheEnCours}
            className="rounded-xl bg-[#1B4332] px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {rechercheEnCours ? "..." : "OK"}
          </button>
        </div>

        {rechercheEnCours && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[#5BA651]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#A7D08C] border-t-[#1B4332]" />
            Recherche de votre plante…
          </div>
        )}

        {resultatsRecherche.length > 0 && (
          <div className="mt-3 space-y-2">
            {resultatsRecherche.map((plante) => (
              <button
                key={`${plante.nomBotanique}-${plante.nomCommun}`}
                type="button"
                onClick={() =>
                  choisirResultatRecherche(plante)
                }
                className="w-full rounded-2xl border border-[#DDE5D8] bg-white p-4 text-left shadow-sm"
              >
                <p className="font-semibold text-[#1B4332]">
                  {plante.nomCommun}
                </p>

                <p className="mt-1 text-sm italic text-gray-500">
                  {plante.nomBotanique}
                </p>

                {plante.precision && (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {plante.precision}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="mt-5 pb-8 text-center text-sm text-gray-500">
          Vous pourrez modifier les informations plus tard.
        </p>
      </div>
    </main>
  );
}