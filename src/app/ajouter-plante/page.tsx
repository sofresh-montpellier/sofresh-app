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
  periode_taille: string;
  pourquoi_taille: string;
  comment_tailler: string;
  intensite_taille: string;
  precautions_taille: string;
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

export default function AjouterPlantePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [fichierPhoto, setFichierPhoto] = useState<File | null>(null);

  const [resultat, setResultat] =
    useState<ResultatIdentification | null>(null);

  const [chargement, setChargement] = useState(false);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  const [massifs, setMassifs] = useState<string[]>([]);
  const [massifSelectionne, setMassifSelectionne] = useState("");
  const [nouveauMassif, setNouveauMassif] = useState("");

  const [dernierArrosage, setDernierArrosage] =
    useState<DernierArrosage>("");

  const [rechercheOuverte, setRechercheOuverte] = useState(false);
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
        .from("plantes")
        .select("massif")
        .eq("user_id", user.id)
        .not("massif", "is", null);

      if (error) {
        console.error("Erreur chargement massifs :", error);
        return;
      }

      const nomsMassifs = Array.from(
        new Set(
          (data ?? [])
            .map((item) => item.massif)
            .filter(
              (massif): massif is string =>
                typeof massif === "string" &&
                massif.trim() !== ""
            )
        )
      );

      setMassifs(nomsMassifs);
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
    setRechercheOuverte(false);
    setResultatsRecherche([]);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

    const massifFinal =
      nouveauMassif.trim() !== ""
        ? nouveauMassif.trim()
        : massifSelectionne.trim();

    if (!massifFinal) {
      alert(
        "Choisissez un massif ou créez-en un nouveau."
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

              {massifs.length > 0 && (
                <div className="mt-5">
                  <label className="text-sm font-medium">
                    Choisir un massif existant
                  </label>

                  <select
                    value={massifSelectionne}
                    onChange={(event) => {
                      setMassifSelectionne(
                        event.target.value
                      );

                      if (
                        event.target.value !== ""
                      ) {
                        setNouveauMassif("");
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                  >
                    <option value="">
                      Sélectionner un massif
                    </option>

                    {massifs.map((massif) => (
                      <option
                        key={massif}
                        value={massif}
                      >
                        {massif}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-5">
                <label className="text-sm font-medium">
                  {massifs.length > 0
                    ? "Ou créer un nouveau massif"
                    : "Créer votre premier massif"}
                </label>

                <input
                  type="text"
                  value={nouveauMassif}
                  onChange={(event) => {
                    setNouveauMassif(
                      event.target.value
                    );

                    if (
                      event.target.value.trim() !== ""
                    ) {
                      setMassifSelectionne("");
                    }
                  }}
                  placeholder="Ex. Terrasse, Balcon, Massif 1..."
                  className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 outline-none"
                />
              </div>

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

        <button
          type="button"
          onClick={() =>
            setRechercheOuverte(
              !rechercheOuverte
            )
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#5BA651] py-4 font-semibold text-[#1B4332]"
        >
          <Search size={19} />
          Rechercher une plante
        </button>

        {rechercheOuverte && (
          <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#5BA651]">
              Recherche manuelle
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Quel est le nom de votre plante ?
            </h2>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={texteRecherche}
                onChange={(event) =>
                  setTexteRecherche(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    rechercherPlante();
                  }
                }}
                placeholder="Ex. Citronnier, lavande..."
                className="min-w-0 flex-1 rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={rechercherPlante}
                disabled={rechercheEnCours}
                className="rounded-2xl bg-[#1B4332] px-4 font-semibold text-white disabled:opacity-60"
              >
                {rechercheEnCours
                  ? "..."
                  : "OK"}
              </button>
            </div>

            {resultatsRecherche.length > 0 && (
              <div className="mt-5 space-y-2">
                {resultatsRecherche.map(
                  (plante) => (
                    <button
                      key={`${plante.nomBotanique}-${plante.nomCommun}`}
                      type="button"
                      onClick={() =>
                        choisirResultatRecherche(
                          plante
                        )
                      }
                      className="w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] p-4 text-left"
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
                  )
                )}
              </div>
            )}

            {!rechercheEnCours &&
              texteRecherche.trim() !== "" &&
              resultatsRecherche.length ===
                0 && (
                <p className="mt-4 text-sm text-gray-500">
                  Lancez la recherche pour voir les plantes proposées.
                </p>
              )}
          </section>
        )}

        <p className="mt-5 pb-8 text-center text-sm text-gray-500">
          Vous pourrez modifier les informations plus tard.
        </p>
      </div>
    </main>
  );
}