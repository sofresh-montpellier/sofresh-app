"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import {
  Home as HomeIcon,
  Sprout,
  CalendarDays,
  UserRound,
  Bell,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import BoutonAjouter from "./ajouter-massif/components/BoutonAjouter";

type TacheFuture = {
  date_prevue: string;
  type_tache: string;
};

export default function Home() {
  const [connecte, setConnecte] = useState(false);
  const [nombreTaches, setNombreTaches] = useState<number | null>(null);

  const [prochaineDate, setProchaineDate] = useState<string | null>(null);
  const [resumeProchainesTaches, setResumeProchainesTaches] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function chargerAccueil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setConnecte(!!user);

      if (!user) {
        setNombreTaches(0);
        setProchaineDate(null);
        setResumeProchainesTaches(null);
        return;
      }

      const aujourdHui = new Date().toISOString().slice(0, 10);

      const { count, error: erreurAujourdHui } = await supabase
        .from("taches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("terminee", false)
        .lte("date_prevue", aujourdHui);

      if (erreurAujourdHui) {
        console.error(
          "Erreur chargement tâches aujourd'hui :",
          erreurAujourdHui
        );
        setNombreTaches(0);
      } else {
        setNombreTaches(count ?? 0);
      }

      const { data: tachesFutures, error: erreurFutures } = await supabase
        .from("taches")
        .select("date_prevue, type_tache")
        .eq("user_id", user.id)
        .eq("terminee", false)
        .gt("date_prevue", aujourdHui)
        .order("date_prevue", { ascending: true })
        .limit(100);

      if (erreurFutures) {
        console.error(
          "Erreur chargement prochaines tâches :",
          erreurFutures
        );
        setProchaineDate(null);
        setResumeProchainesTaches(null);
        return;
      }

      const liste = (tachesFutures ?? []) as TacheFuture[];

      if (liste.length === 0) {
        setProchaineDate(null);
        setResumeProchainesTaches(null);
        return;
      }

      const date = liste[0].date_prevue;

      const tachesMemeJour = liste.filter(
        (tache) => tache.date_prevue === date
      );

      const compteurs: Record<string, number> = {};

      for (const tache of tachesMemeJour) {
        const type = normaliserTypeTache(tache.type_tache);

        compteurs[type] = (compteurs[type] ?? 0) + 1;
      }

      const resume = Object.entries(compteurs)
        .map(([type, nombre]) => {
          return `${iconeTypeTache(type)} ${nombre} ${libelleTypeTache(
            type,
            nombre
          )}`;
        })
        .join(" · ");

      setProchaineDate(date);
      setResumeProchainesTaches(resume);
    }

    chargerAccueil();
  }, []);

  function texteTaches() {
    if (nombreTaches === null) {
      return "Chargement...";
    }

    if (nombreTaches === 0) {
      return "Jardin à jour";
    }

    if (nombreTaches === 1) {
      return "1 tâche à faire";
    }

    return `${nombreTaches} tâches à faire`;
  }

  function normaliserTypeTache(type: string) {
    return type.trim().toLowerCase();
  }

  function iconeTypeTache(type: string) {
    if (type.includes("arros")) return "💧";
    if (type.includes("taill")) return "✂️";
    if (type.includes("engrais")) return "🌱";
    if (type.includes("rempot")) return "🪴";
    if (type.includes("trait")) return "🛡️";

    return "🌿";
  }

  function libelleTypeTache(type: string, nombre: number) {
    if (type.includes("arros")) {
      return nombre === 1 ? "arrosage" : "arrosages";
    }

    if (type.includes("taill")) {
      return nombre === 1 ? "taille" : "tailles";
    }

    if (type.includes("engrais")) {
      return "engrais";
    }

    if (type.includes("rempot")) {
      return nombre === 1 ? "rempotage" : "rempotages";
    }

    if (type.includes("trait")) {
      return nombre === 1 ? "traitement" : "traitements";
    }

    return nombre === 1 ? "soin" : "soins";
  }

  function afficherDate(date: string | null) {
    if (!date) return "À venir";

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const demain = new Date(aujourdHui);
    demain.setDate(demain.getDate() + 1);

    const dateTache = new Date(`${date}T00:00:00`);

    if (dateTache.getTime() === demain.getTime()) {
      return "Demain";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
    }).format(dateTache);
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332] font-[family-name:var(--font-inter)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="px-5">
          <header className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center">
                <Image
                  src="/logo_feuilla.png"
                  alt="Logo Feuillia"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                  priority
                />
              </div>

              <div>
                <h1 className="font-[family-name:var(--font-poppins)] text-[22px] font-semibold leading-none">
                  Feuillia
                </h1>

                <p className="mt-1 text-[11px] text-[#5BA651]">
                  Jardiner sereinement
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E4D2] bg-white"
            >
              <Bell size={18} strokeWidth={1.8} />
            </button>
          </header>

          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-poppins)] text-[26px] font-semibold leading-tight">
              Aujourd’hui
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Prenons soin de votre jardin.
            </p>
          </section>

          <section className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Mes tâches
            </p>

            <a
              href="/aujourdhui"
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E4]">
                <Sprout
                  size={26}
                  strokeWidth={2}
                  className="text-[#4B8E3C]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">
                  Aujourd’hui
                </p>

                <h3 className="mt-0.5 font-[family-name:var(--font-poppins)] text-base font-semibold">
                  {texteTaches()}
                </h3>
              </div>

              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C8D8BF]">
                <span className="text-sm text-[#5BA651]">
                  ›
                </span>
              </div>
            </a>
          </section>

          <section className="mt-7">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Prochain rappel
            </p>

            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF1C8]">
                <CalendarDays
                  size={24}
                  strokeWidth={2}
                  className="text-[#D69A12]"
                />
              </div>

              <div className="min-w-0">
                <p className="font-[family-name:var(--font-poppins)] text-base font-semibold">
                  {afficherDate(prochaineDate)}
                </p>

                <p className="mt-0.5 text-sm text-gray-500">
                  {resumeProchainesTaches ??
                    "Aucun soin programmé pour le moment."}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-7">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Conseil Feuillia
            </p>

            <div className="rounded-2xl border border-[#DCE7D6] bg-[#F0F6EC] p-4">
              <p className="text-sm leading-6 text-[#355B2D]">
                Observez vos plantes régulièrement : feuillage,
                humidité de la terre et nouvelles pousses donnent
                souvent les meilleurs indices.
              </p>
            </div>
          </section>
        </div>

        <nav className="mt-auto flex items-center justify-around border-t border-[#DDE5D8] bg-[#F7F5EE] px-4 py-4">
          <a
            href="/"
            className="flex flex-col items-center gap-1 text-[#1B4332]"
          >
            <HomeIcon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">
              Accueil
            </span>
          </a>

          <a
            href="/mes-plantes"
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <Sprout size={22} strokeWidth={2} />
            <span className="text-[10px]">
              Mes plantes
            </span>
          </a>

          <a
            href="/aujourdhui"
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <CalendarDays size={22} strokeWidth={2} />
            <span className="text-[10px]">
              Aujourd’hui
            </span>
          </a>

          <a
            href={connecte ? "/profil" : "/connexion"}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <UserRound size={22} strokeWidth={2} />
            <span className="text-[10px]">
              Profil
            </span>
          </a>
        </nav>

        <BoutonAjouter />
      </div>
    </main>
  );
}