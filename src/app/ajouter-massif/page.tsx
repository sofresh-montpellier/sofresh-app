"use client";

import { useState } from "react";
import { HousePlus, Plus, Sprout, X } from "lucide-react";

export default function BoutonAjouter() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      {ouvert && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOuvert(false)}
        />
      )}

      <div
        className="fixed z-50 flex flex-col items-end gap-2"
        style={{
          right: "18px",
          bottom: "105px",
        }}
      >
        {ouvert && (
          <>
            <a
              href="/ajouter-plante"
              className="flex items-center gap-2"
            >
              <span className="rounded-xl bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white shadow-lg">
                Ajouter une plante
              </span>

              <span
                className="flex items-center justify-center rounded-full bg-[#1B4332] text-white shadow-lg"
                style={{
                  width: "34px",
                  height: "34px",
                }}
              >
                <Sprout size={16} />
              </span>
            </a>

            <a
              href="/ajouter-massif"
              className="flex items-center gap-2"
            >
              <span className="rounded-xl bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white shadow-lg">
                Ajouter un site
              </span>

              <span
                className="flex items-center justify-center rounded-full bg-[#1B4332] text-white shadow-lg"
                style={{
                  width: "34px",
                  height: "34px",
                }}
              >
                <HousePlus size={16} />
              </span>
            </a>
          </>
        )}

        <button
          type="button"
          onClick={() => setOuvert(!ouvert)}
          aria-label={ouvert ? "Fermer le menu" : "Ajouter"}
          className="flex items-center justify-center rounded-full bg-[#1B4332] text-white shadow-lg"
          style={{
            width: "38px",
            height: "38px",
          }}
        >
          {ouvert ? <X size={19} /> : <Plus size={21} />}
        </button>
      </div>
    </>
  );
}