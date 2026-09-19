import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { erreur: "Le service OpenAI n'est pas configuré." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const nomCommun =
      typeof body.nomCommun === "string"
        ? body.nomCommun.trim()
        : "";

    const nomBotanique =
      typeof body.nomBotanique === "string"
        ? body.nomBotanique.trim()
        : "";

    const modeCulture =
      body.modeCulture === "pot_bac"
        ? "pot_bac"
        : body.modeCulture === "pleine_terre"
          ? "pleine_terre"
          : "inconnu";

    const typeSite =
      body.typeSite === "interieur"
        ? "interieur"
        : body.typeSite === "exterieur"
          ? "exterieur"
          : "inconnu";

    if (!nomBotanique) {
      return NextResponse.json(
        { erreur: "Le nom botanique est obligatoire." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: "gpt-5-mini",

      instructions: `
Tu es le moteur horticole de l'application Feuillia.

Ta seule mission est d'évaluer la résistance au froid d'une plante
dans son contexte réel de culture.

Tu dois fournir exactement trois informations.

TEMPERATURE_MIN_TOLEREE :
- température minimale approximative en degrés Celsius que cette espèce peut supporter ;
- renvoie uniquement un nombre ;
- le nombre peut être négatif ;
- n'ajoute pas d'unité ;
- utilise une valeur horticole raisonnable et prudente ;
- tiens compte du mode de culture ;
- une plante en pot peut être plus vulnérable au froid qu'une plante comparable en pleine terre ;
- évite toute précision artificielle.

SEUIL_VIGILANCE_FROID :
- température extérieure minimale prévisionnelle à partir de laquelle Feuillia doit prévenir l'utilisateur ;
- renvoie uniquement un nombre ;
- n'ajoute pas d'unité ;
- ce seuil doit normalement être supérieur à TEMPERATURE_MIN_TOLEREE afin de laisser une marge d'action ;
- adapte cette marge à la sensibilité réelle de l'espèce ;
- n'utilise pas arbitrairement la même marge pour toutes les plantes ;
- une plante très rustique peut avoir un seuil négatif ;
- une plante tropicale ou très frileuse peut avoir un seuil positif.

PROTECTION_FROID :
- donne une consigne courte, concrète et directement applicable ;
- adapte impérativement la consigne au contexte réel de culture ;
- pour une plante en pot ou bac extérieur, indique s'il faut la déplacer, rentrer ou protéger le contenant lorsque cela est pertinent ;
- pour une plante en pleine terre, recommande voile, paillage ou protection du pied uniquement lorsque cela est réellement utile ;
- pour une plante intérieure, indique surtout la température ambiante minimale à préserver et les précautions près des vitrages ou courants d'air ;
- ne recommande pas systématiquement une protection si l'espèce n'en a pas besoin ;
- ne promets jamais qu'une protection garantit la survie à n'importe quelle température.

Ne fournis aucun autre conseil.
`,

      input: `
Plante à analyser :

Nom commun : ${nomCommun || "Non renseigné"}
Nom botanique : ${nomBotanique}
Mode de culture : ${modeCulture}
Type de site : ${typeSite}

Évalue uniquement sa résistance au froid dans ce contexte.
`,

      text: {
        format: {
          type: "json_schema",
          name: "donnees_froid",
          strict: true,

          schema: {
            type: "object",

            properties: {
              temperature_min_toleree: {
                type: "number",
                minimum: -50,
                maximum: 30,
              },

              seuil_vigilance_froid: {
                type: "number",
                minimum: -50,
                maximum: 35,
              },

              protection_froid: {
                type: "string",
              },
            },

            required: [
              "temperature_min_toleree",
              "seuil_vigilance_froid",
              "protection_froid",
            ],

            additionalProperties: false,
          },
        },
      },
    });

    const contenu = response.output_text;

    if (!contenu) {
      throw new Error(
        "Aucune donnée de résistance au froid reçue."
      );
    }

    const donnees = JSON.parse(contenu);

    return NextResponse.json(donnees);
  } catch (error) {
    console.error(
      "Erreur génération données froid :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de générer les données de résistance au froid.",
      },
      { status: 500 }
    );
  }
}