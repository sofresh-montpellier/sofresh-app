"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Leaf,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Plante = {
  id: number;
  nom_commun: string;
  nom_botanique: string;
  photo_url: string | null;
  massif: string | null;
};

type PhotoDiagnostic = {
  fichier: File;
  apercu: string;
};

export default function DiagnosticPlantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const inputPhotoRef =
    useRef<HTMLInputElement>(null);

  const [idPlante, setIdPlante] =
    useState<string | null>(null);

  const [plante, setPlante] =
    useState<Plante | null>(null);

  const [chargement, setChargement] =
    useState(true);

  const [photos, setPhotos] =
    useState<PhotoDiagnostic[]>([]);

  const [description, setDescription] =
    useState("");

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
        .select(
          "id, nom_commun, nom_botanique, photo_url, massif"
        )
        .eq("id", idPlante)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
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

  function ouvrirPhotos() {
    inputPhotoRef.current?.click();
  }

  function ajouterPhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const fichiers = Array.from(
      event.target.files ?? []
    );

    if (fichiers.length === 0) return;

    const placesDisponibles =
      3 - photos.length;

    const nouveauxFichiers =
      fichiers.slice(0, placesDisponibles);

    const nouvellesPhotos =
      nouveauxFichiers.map((fichier) => ({
        fichier,
        apercu: URL.createObjectURL(fichier),
      }));

    setPhotos((anciennesPhotos) => [
      ...anciennesPhotos,
      ...nouvellesPhotos,
    ]);

    event.target.value = "";
  }

  function supprimerPhoto(index: number) {
    setPhotos((anciennesPhotos) => {
      const photoSupprimee =
        anciennesPhotos[index];

      if (photoSupprimee) {
        URL.revokeObjectURL(
          photoSupprimee.apercu
        );
      }

      return anciennesPhotos.filter(
        (_, position) => position !== index
      );
    });
  }

  function analyserProbleme() {
    if (photos.length === 0) {
      alert(
        "Ajoutez au moins une photo du problème."
      );
      return;
    }

    alert(
      "Les photos sont prêtes. Nous allons maintenant connecter l’analyse Feuillia."
    );
  }

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
        <a
          href={`/plante/${plante.id}`}
          aria-label="Retour"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          <ArrowLeft size={19} />
        </a>

        <header className="mt-6">
          <p className="text-sm font-medium text-[#5BA651]">
            Diagnostic Feuillia
          </p>

          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Que se passe-t-il ?
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Photographiez les parties qui vous
            semblent anormales. Plusieurs vues
            permettent de mieux comprendre le
            problème.
          </p>
        </header>

        <section className="mt-6 flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF5E9]">
            {plante.photo_url ? (
              <img
                src={plante.photo_url}
                alt={plante.nom_commun}
                className="h-full w-full object-cover"
              />
            ) : (
              <Leaf
                size={30}
                className="text-[#5BA651]"
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-[#5BA651]">
              Diagnostic pour
            </p>

            <h2 className="mt-1 truncate text-lg font-semibold">
              {plante.nom_commun}
            </h2>

            <p className="truncate text-sm italic text-gray-500">
              {plante.nom_botanique}
            </p>

            {plante.massif && (
              <p className="mt-1 text-xs text-gray-400">
                {plante.massif}
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[26px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5E9]">
              <Camera
                size={21}
                className="text-[#5BA651]"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-[#5BA651]">
                Photos du problème
              </p>

              <h2 className="text-lg font-semibold">
                Jusqu’à 3 photos
              </h2>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-500">
            Prenez par exemple une vue générale,
            une photo rapprochée de la zone
            touchée et le dessous d’une feuille.
          </p>

          {photos.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              {photos.map(
                (photo, index) => (
                  <div
                    key={photo.apercu}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-[#EEF5E9]"
                  >
                    <img
                      src={photo.apercu}
                      alt={`Photo diagnostic ${
                        index + 1
                      }`}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        supprimerPhoto(index)
                      }
                      aria-label="Supprimer la photo"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#1B4332] shadow-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {photos.length < 3 && (
            <button
              type="button"
              onClick={ouvrirPhotos}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#A7D08C] bg-[#EEF5E9] px-4 py-4 font-semibold text-[#1B4332]"
            >
              <ImagePlus size={20} />

              {photos.length === 0
                ? "Ajouter des photos"
                : "Ajouter une autre photo"}
            </button>
          )}

          <input
            ref={inputPhotoRef}
            type="file"
            accept="image/*"
            multiple
            onChange={ajouterPhotos}
            className="hidden"
          />

          <p className="mt-3 text-center text-xs text-gray-400">
            {photos.length} / 3 photo
            {photos.length > 1 ? "s" : ""}
          </p>
        </section>

        <section className="mt-5 rounded-[26px] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#5BA651]">
            Ce que vous observez
          </p>

          <h2 className="mt-1 text-lg font-semibold">
            Décrivez le problème
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Facultatif, mais utile : depuis quand,
            quelles parties sont touchées, présence
            d’insectes, feuilles qui jaunissent,
            taches, chute des feuilles…
          </p>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            rows={5}
            placeholder="Ex. Depuis une semaine, plusieurs feuilles jaunissent et présentent de petites taches brunes..."
            className="mt-4 w-full resize-none rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4 text-sm leading-6 outline-none"
          />
        </section>

        <div className="mt-6 rounded-2xl bg-[#FFF7DE] p-4">
          <p className="text-sm leading-6 text-[#725B1D]">
            Feuillia recherchera les causes les
            plus probables. Une photo ne permet
            pas toujours d’identifier un problème
            avec certitude : des vérifications
            pourront vous être proposées.
          </p>
        </div>

        <button
          type="button"
          onClick={analyserProbleme}
          className="mt-6 w-full rounded-2xl bg-[#1B4332] py-4 font-semibold text-white"
        >
          Analyser le problème
        </button>
      </div>
    </main>
  );
}