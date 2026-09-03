import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          erreur:
            "Le service de recherche n'est pas configuré.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const recherche =
      typeof body.recherche === "string"
        ? body.recherche.trim()
        : "";

    if (recherche.length < 2) {
      return NextResponse.json(
        {
          erreur:
            "Le nom de la plante est trop court.",
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu aides l'application Feuillia à rechercher une plante à partir d'un nom saisi par un jardinier amateur.

Tu dois proposer au maximum 5 plantes correspondant réellement à la recherche.

Pour chaque résultat :
- donne le nom commun en français ;
- donne le nom botanique scientifique ;
- ajoute une courte précision uniquement si elle aide à distinguer plusieurs plantes proches.

IMPORTANT :
- N'invente pas de plante.
- Évite les doublons.
- Si la recherche est ambiguë, propose plusieurs possibilités pertinentes.
- Si aucune identification raisonnable n'est possible, renvoie une liste vide.
`,

        input: `
Recherche saisie par l'utilisateur :
${recherche}
`,

        text: {
          format: {
            type: "json_schema",
            name: "resultats_recherche_plante",
            strict: true,

            schema: {
              type: "object",

              properties: {
                resultats: {
                  type: "array",
                  maxItems: 5,

                  items: {
                    type: "object",

                    properties: {
                      nomCommun: {
                        type: "string",
                      },

                      nomBotanique: {
                        type: "string",
                      },

                      precision: {
                        type: "string",
                      },
                    },

                    required: [
                      "nomCommun",
                      "nomBotanique",
                      "precision",
                    ],

                    additionalProperties: false,
                  },
                },
              },

              required: ["resultats"],

              additionalProperties: false,
            },
          },
        },
      });

    const contenu =
      response.output_text;

    if (!contenu) {
      throw new Error(
        "Aucune réponse reçue."
      );
    }

    const resultat =
      JSON.parse(contenu);

    return NextResponse.json(
      resultat
    );
  } catch (error) {
    console.error(
      "Erreur recherche plante :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de rechercher cette plante.",
      },
      { status: 500 }
    );
  }
}