"use client";

import { useState } from "react";
import {
  BrickWall,
  CloudRain,
  CloudSun,
  House,
  Layers3,
  MapPinHouse,
  Sun,
  CloudSun as SoleilPartiel,
  Cloudy,
  CircleHelp,
  Trees,
  Wind,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type TypeSite = "exterieur" | "interieur";

type LuminositeInterieur =
  | "lumineuse"
  | "moyenne"
  | "sombre"
  | "inconnu";

type OrientationFenetre =
  | "nord"
  | "nord_est"
  | "est"
  | "sud_est"
  | "sud"
  | "sud_ouest"
  | "ouest"
  | "nord_ouest"
  | "inconnu";

type LumiereInterieur =
  | "directe"
  | "indirecte"
  | "mixte"
  | "inconnu";

type ExpositionPluie =
  | "ciel_ouvert"
  | "partiellement_couvert"
  | "sous_toit";

type ExpositionVent =
  | "expose"
  | "partiellement_abrite"
  | "abrite";

type TypeSol =
  | "leger"
  | "normal"
  | "lourd"
  | "substrat"
  | "inconnu";

type ExpositionSoleil =
  | "plein_soleil"
  | "mi_ombre"
  | "ombre"
  | "inconnu";

export default function AjouterMassifPage() {
  const [nom, setNom] = useState("");

  const [typeSite, setTypeSite] =
    useState<TypeSite>("exterieur");

  const [luminositeInterieur, setLuminositeInterieur] =
    useState<LuminositeInterieur>("inconnu");

  const [orientationFenetre, setOrientationFenetre] =
    useState<OrientationFenetre>("inconnu");

  const [lumiereInterieur, setLumiereInterieur] =
    useState<LumiereInterieur>("inconnu");

  const [expositionPluie, setExpositionPluie] =
    useState<ExpositionPluie>("ciel_ouvert");

  const [expositionVent, setExpositionVent] =
    useState<ExpositionVent>("partiellement_abrite");

  const [typeSol, setTypeSol] =
    useState<TypeSol>("inconnu");

  const [expositionSoleil, setExpositionSoleil] =
    useState<ExpositionSoleil>("inconnu");

  const [enregistrement, setEnregistrement] =
    useState(false);

  async function ajouterSite() {
    const nomNettoye = nom.trim();

    if (!nomNettoye) {
      alert("Donnez un nom au site.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/connexion";
      return;
    }

    setEnregistrement(true);

    const { data: siteExistant, error: erreurRecherche } =
      await supabase
        .from("massifs")
        .select("id")
        .eq("user_id", user.id)
        .ilike("nom", nomNettoye)
        .maybeSingle();

    if (erreurRecherche) {
      console.error(
        "Erreur vérification du site :",
        erreurRecherche
      );

      alert(
        "Impossible de vérifier si ce site existe déjà."
      );

      setEnregistrement(false);
      return;
    }

    if (siteExistant) {
      alert("Un site avec ce nom existe déjà.");
      setEnregistrement(false);
      return;
    }

    const { error } = await supabase
      .from("massifs")
      .insert({
        user_id: user.id,
        nom: nomNettoye,
        type_site: typeSite,
        exposition_pluie:
          typeSite === "exterieur" ? expositionPluie : null,
        exposition_vent:
          typeSite === "exterieur" ? expositionVent : null,
        type_sol: typeSite === "interieur" ? "substrat" : typeSol,
        exposition_soleil:
          typeSite === "exterieur" ? expositionSoleil : null,
        luminosite_interieur:
          typeSite === "interieur" ? luminositeInterieur : null,
        orientation_fenetre:
          typeSite === "interieur" ? orientationFenetre : null,
        lumiere_interieur:
          typeSite === "interieur" ? lumiereInterieur : null,
      });

    if (error) {
      console.error(
        "Erreur création du site :",
        error
      );

      alert(
        "Impossible d'ajouter le site."
      );

      setEnregistrement(false);
      return;
    }

    window.location.href = "/mes-plantes";
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-6 py-8">
        <a
          href="/mes-plantes"
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
            Ajouter un site
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Décrivez l&apos;emplacement pour que Feuillia
            puisse adapter ses futurs conseils.
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-5 shadow-sm">
          <label
            htmlFor="nom-site"
            className="text-sm font-semibold"
          >
            Nom du site
          </label>

          <input
            id="nom-site"
            type="text"
            value={nom}
            onChange={(event) =>
              setNom(event.target.value)
            }
            placeholder="Ex. Terrasse, balcon, massif sud..."
            className="mt-3 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 text-sm outline-none"
          />
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPinHouse size={20} className="text-[#5BA651]" />
            <div>
              <h2 className="text-sm font-semibold">
                Type de site
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Ce site se trouve-t-il à l’extérieur ou à l’intérieur ?
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTypeSite("exterieur")}
              className={`rounded-2xl border px-3 py-4 text-sm font-semibold ${
                typeSite === "exterieur"
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#E3E8DF] bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              ☀️ Extérieur
            </button>

            <button
              type="button"
              onClick={() => setTypeSite("interieur")}
              className={`rounded-2xl border px-3 py-4 text-sm font-semibold ${
                typeSite === "interieur"
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#E3E8DF] bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              🏠 Intérieur
            </button>
          </div>
        </section>

        {typeSite === "exterieur" && (
          <>
        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CloudRain
              size={20}
              className="text-[#5BA651]"
            />

            <div>
              <h2 className="text-sm font-semibold">
                Exposition à la pluie
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                La pluie atteint-elle directement les plantes ?
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setExpositionPluie("ciel_ouvert")
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionPluie === "ciel_ouvert"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <CloudRain
                size={17}
                className="mx-auto mb-1"
              />
              Ciel ouvert
            </button>

            <button
              type="button"
              onClick={() =>
                setExpositionPluie(
                  "partiellement_couvert"
                )
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionPluie ===
                "partiellement_couvert"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <CloudSun
                size={17}
                className="mx-auto mb-1"
              />
              Partiel
            </button>

            <button
              type="button"
              onClick={() =>
                setExpositionPluie("sous_toit")
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionPluie === "sous_toit"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <House
                size={17}
                className="mx-auto mb-1"
              />
              Sous toit
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wind
              size={20}
              className="text-[#5BA651]"
            />

            <div>
              <h2 className="text-sm font-semibold">
                Exposition au vent
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Le site est-il exposé ou protégé du vent ?
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setExpositionVent("expose")
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionVent === "expose"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <Wind
                size={17}
                className="mx-auto mb-1"
              />
              Exposé
            </button>

            <button
              type="button"
              onClick={() =>
                setExpositionVent(
                  "partiellement_abrite"
                )
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionVent ===
                "partiellement_abrite"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <Trees
                size={17}
                className="mx-auto mb-1"
              />
              Partiel
            </button>

            <button
              type="button"
              onClick={() =>
                setExpositionVent("abrite")
              }
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                expositionVent === "abrite"
                  ? "bg-[#1B4332] text-white"
                  : "bg-[#F7F5EE] text-[#1B4332]"
              }`}
            >
              <BrickWall
                size={17}
                className="mx-auto mb-1"
              />
              À l&apos;abri
            </button>
          </div>
        </section>



        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sun
              size={20}
              className="text-[#5BA651]"
            />

            <div>
              <h2 className="text-sm font-semibold">
                Exposition au soleil
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Choisissez l&apos;ensoleillement habituel de ce site.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              {
                valeur: "plein_soleil" as ExpositionSoleil,
                titre: "Plein soleil",
                detail: "6 h ou plus de soleil direct par jour",
                Icone: Sun,
              },
              {
                valeur: "mi_ombre" as ExpositionSoleil,
                titre: "Mi-ombre",
                detail: "Environ 3 à 6 h de soleil direct par jour",
                Icone: SoleilPartiel,
              },
              {
                valeur: "ombre" as ExpositionSoleil,
                titre: "Ombre",
                detail: "Moins de 3 h de soleil direct par jour",
                Icone: Cloudy,
              },
              {
                valeur: "inconnu" as ExpositionSoleil,
                titre: "Je ne sais pas",
                detail: "Feuillia utilisera une estimation prudente",
                Icone: CircleHelp,
              },
            ].map((option) => {
              const Icone = option.Icone;

              return (
                <button
                  key={option.valeur}
                  type="button"
                  onClick={() =>
                    setExpositionSoleil(option.valeur)
                  }
                  className={`rounded-2xl border px-3 py-4 text-xs font-semibold transition ${
                    expositionSoleil === option.valeur
                      ? "border-[#1B4332] bg-[#1B4332] text-white"
                      : "border-[#E3E8DF] bg-[#F7F5EE] text-[#1B4332]"
                  }`}
                >
                  <Icone
                    size={18}
                    className="mx-auto mb-2"
                  />

                  <span className="block">
                    {option.titre}
                  </span>

                  <span
                    className={`mt-1 block text-[10px] font-normal leading-4 ${
                      expositionSoleil === option.valeur
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
        </section>
          </>
        )}

        {typeSite === "interieur" && (
          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <House size={20} className="text-[#5BA651]" />
              <div>
                <h2 className="text-sm font-semibold">
                  Lumière intérieure
                </h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Décrivez la lumière habituelle de cette pièce.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold">
                Luminosité de la pièce
              </label>
              <select
                value={luminositeInterieur}
                onChange={(event) =>
                  setLuminositeInterieur(
                    event.target.value as LuminositeInterieur
                  )
                }
                className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 text-sm outline-none"
              >
                <option value="lumineuse">Pièce lumineuse</option>
                <option value="moyenne">Luminosité moyenne</option>
                <option value="sombre">Pièce plutôt sombre</option>
                <option value="inconnu">Je ne sais pas</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold">
                Orientation de la fenêtre principale
              </label>
              <select
                value={orientationFenetre}
                onChange={(event) =>
                  setOrientationFenetre(
                    event.target.value as OrientationFenetre
                  )
                }
                className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 text-sm outline-none"
              >
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
              <label className="text-sm font-semibold">
                Lumière reçue dans ce site
              </label>
              <select
                value={lumiereInterieur}
                onChange={(event) =>
                  setLumiereInterieur(
                    event.target.value as LumiereInterieur
                  )
                }
                className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#F7F5EE] px-4 py-3 text-sm outline-none"
              >
                <option value="directe">Soleil direct</option>
                <option value="indirecte">Lumière indirecte</option>
                <option value="mixte">Directe et indirecte selon l’heure</option>
                <option value="inconnu">Je ne sais pas</option>
              </select>
            </div>
          </section>
        )}

        {typeSite === "exterieur" && (
          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers3 size={20} className="text-[#5BA651]" />
              <div>
                <h2 className="text-sm font-semibold">
                  Type de sol
                </h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Choisissez ce qui ressemble le plus à la terre de ce site.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { valeur: "leger" as TypeSol, titre: "Très léger / sableux", detail: "L’eau s’écoule vite et la terre sèche rapidement." },
                { valeur: "normal" as TypeSol, titre: "Normal / équilibré", detail: "La terre retient l’eau sans rester longtemps détrempée." },
                { valeur: "lourd" as TypeSol, titre: "Lourd / argileux", detail: "La terre reste humide longtemps et peut devenir compacte." },
                { valeur: "substrat" as TypeSol, titre: "Terreau / substrat", detail: "Pour pots, jardinières, bacs ou culture en contenant." },
                { valeur: "inconnu" as TypeSol, titre: "Je ne sais pas", detail: "Feuillia utilisera une estimation prudente." },
              ].map((option) => (
                <button
                  key={option.valeur}
                  type="button"
                  onClick={() => setTypeSol(option.valeur)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    typeSol === option.valeur
                      ? "border-[#1B4332] bg-[#EEF5E9]"
                      : "border-[#E3E8DF] bg-[#F7F5EE]"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.titre}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{option.detail}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          disabled={enregistrement}
          onClick={ajouterSite}
          className="mt-6 w-full rounded-2xl bg-[#1B4332] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enregistrement
            ? "Enregistrement..."
            : "Ajouter le site"}
        </button>
      </div>
    </main>
  );
}
