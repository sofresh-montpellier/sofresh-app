import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ImageDiagnostic = {
  dataUrl: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          erreur: "Le service de diagnostic n'est pas configuré.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const nomCommun =
      typeof body.nomCommun === "string" ? body.nomCommun.trim() : "";

    const nomBotanique =
      typeof body.nomBotanique === "string" ? body.nomBotanique.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    const contexte =
      body.contexte && typeof body.contexte === "object" ? body.contexte : {};

    const images: ImageDiagnostic[] = Array.isArray(body.images)
      ? body.images
          .filter(
            (image: unknown) =>
              typeof image === "string" && image.startsWith("data:image/")
          )
          .slice(0, 3)
          .map((dataUrl: string) => ({
            dataUrl,
          }))
      : [];

    if (!nomBotanique) {
      return NextResponse.json(
        {
          erreur: "Le nom botanique de la plante est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        {
          erreur:
            "Au moins une photo est nécessaire pour réaliser le diagnostic.",
        },
        { status: 400 }
      );
    }

    const contenuUtilisateur: any[] = [
      {
        type: "input_text",
        text: `
Analyse un problème observé sur cette plante.

PLANTE
Nom commun : ${nomCommun || "Non renseigné"}
Nom botanique : ${nomBotanique}

DESCRIPTION DE L'UTILISATEUR
${description || "Aucune description complémentaire."}

CONTEXTE DE CULTURE
${JSON.stringify(contexte, null, 2)}

Tu disposes de ${images.length} photo${images.length > 1 ? "s" : ""} du problème.

Analyse toutes les photos ensemble.
        `.trim(),
      },
    ];

    for (const image of images) {
      contenuUtilisateur.push({
        type: "input_image",
        image_url: image.dataUrl,
        detail: "high",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",

      instructions: `
Tu es le moteur de diagnostic horticole de Feuillia.

Tu aides un jardinier amateur à comprendre un problème visible sur une plante déjà identifiée.

Tu disposes :
- de l'espèce botanique connue ;
- du contexte réel de culture ;
- éventuellement d'une description donnée par l'utilisateur ;
- d'une à trois photos du problème.

OBJECTIF

Tu dois rechercher les causes les plus plausibles du problème observé.

Une cause peut être notamment :
- maladie fongique ;
- maladie bactérienne ;
- parasite ou ravageur ;
- excès d'eau ;
- manque d'eau ;
- problème de drainage ;
- carence nutritive ;
- excès d'engrais ;
- brûlure solaire ;
- manque de lumière ;
- froid ou gel ;
- chaleur excessive ;
- stress de transplantation ;
- problème racinaire ;
- vieillissement naturel ;
- dommage mécanique ;
- ou toute autre cause horticole pertinente.

IMPORTANT

Une photo seule ne permet pas toujours d'établir un diagnostic certain.

Tu ne dois jamais transformer une hypothèse en certitude lorsque les éléments disponibles ne permettent pas de conclure.

Tu dois distinguer :
- ce qui est réellement visible ;
- ce qui est probable ;
- ce qui doit encore être vérifié.

N'invente jamais un symptôme qui n'est ni visible sur les photos ni décrit par l'utilisateur.

Ne prétends pas avoir observé :
- les racines ;
- l'humidité du substrat ;
- l'intérieur d'une tige ;
- la présence d'insectes invisibles ;
- une odeur ;
- ou tout autre élément inaccessible sur les photos.

Si plusieurs causes peuvent produire des symptômes similaires, indique-le.

CONTEXTE RÉEL

Utilise le contexte de culture lorsqu'il est fourni.

Par exemple :
- intérieur ou extérieur ;
- pot/bac ou pleine terre ;
- site ;
- lumière ;
- arrosage ;
- drainage ;
- substrat ;
- caractéristiques du pot ;
- informations météo éventuellement fournies.

Ne donne pas une explication incompatible avec le contexte connu.

OBSERVATIONS_VISIBLES

Décris brièvement les symptômes réellement visibles.

Reste factuel.

Exemples :
- jaunissement entre les nervures ;
- taches brunes circulaires ;
- bord des feuilles desséché ;
- dépôt blanc ;
- trous dans le limbe ;
- feuilles affaissées.

Ne donne pas encore le diagnostic dans cette partie.

RESUME

Résume le problème en quelques phrases simples.

Explique ce que les images suggèrent sans présenter une hypothèse comme certaine.

CAUSES_PROBABLES

Renvoie au maximum 3 causes.

Classe-les de la plus plausible à la moins plausible.

Pour chaque cause, indique :
- cause : nom clair et compréhensible ;
- probabilite : "elevee", "moyenne" ou "faible" ;
- pourquoi : explique quels éléments visibles ou contextuels rendent cette hypothèse plausible ;
- signes_a_verifier : ce que l'utilisateur peut regarder lui-même pour confirmer ou écarter cette hypothèse.

IMPORTANT :
La probabilité est qualitative.
Elle ne représente pas une probabilité mathématique.

N'utilise jamais de pourcentage inventé.

NIVEAU_CONFIANCE

Évalue la confiance globale du diagnostic :

- "faible" : les images ou informations ne permettent pas de différencier correctement plusieurs causes ;
- "moyen" : certains signes sont assez caractéristiques mais des vérifications restent nécessaires ;
- "eleve" : les signes visibles sont très caractéristiques et cohérents avec le contexte.

Utilise "eleve" avec prudence.

VERIFICATIONS

Donne une liste courte de vérifications concrètes que l'utilisateur peut effectuer immédiatement.

Exemples :
- regarder le dessous des feuilles ;
- vérifier si le substrat est humide à quelques centimètres ;
- rechercher de petites toiles ;
- vérifier la présence de cochenilles ;
- observer si les taches progressent ;
- vérifier l'état des jeunes pousses.

Ne demande pas de matériel professionnel.

ACTIONS_CONSEILLEES

Donne uniquement les premières actions raisonnables et sûres compte tenu du niveau d'incertitude.

Privilégie :
- observation ;
- isolement si pertinent ;
- suppression limitée des parties fortement atteintes si pertinent ;
- correction d'arrosage ;
- amélioration de l'aération ;
- correction de lumière ;
- nettoyage ;
- mesures culturales simples.

Ne recommande pas automatiquement un traitement chimique.

Si l'identification exacte du problème doit être confirmée avant un traitement spécifique, dis-le.

ACTIONS_A_EVITER

Liste les erreurs susceptibles d'aggraver la situation.

Par exemple :
- sur-arroser une plante déjà trop humide ;
- fertiliser une plante fortement stressée ;
- traiter avec plusieurs produits au hasard ;
- supprimer une grande partie du feuillage sans nécessité ;
- exposer brutalement une plante au plein soleil.

URGENCE

Choisis une seule valeur :
- "surveiller"
- "agir_bientot"
- "agir_rapidement"

"agir_rapidement" doit être réservé aux situations où attendre pourrait réellement aggraver fortement le problème ou favoriser sa propagation.

QUESTION_SUIVI

Si une information simple permettrait d'améliorer fortement le diagnostic, pose UNE question courte.

Sinon renvoie une chaîne vide.

Exemples :
- "Le dessous des feuilles présente-t-il de petites toiles ?"
- "La terre est-elle encore humide plusieurs jours après l'arrosage ?"

Ne pose pas plusieurs questions dans ce champ.

STYLE

Écris en français.
Utilise un vocabulaire compréhensible par un jardinier amateur.
Sois précis mais pas alarmiste.
Les recommandations doivent être adaptées à l'espèce et au contexte réel.
      `,

      input: [
        {
          role: "user",
          content: contenuUtilisateur,
        },
      ],

      text: {
        format: {
          type: "json_schema",
          name: "diagnostic_plante",
          strict: true,

          schema: {
            type: "object",
            additionalProperties: false,

            properties: {
              observations_visibles: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              resume: {
                type: "string",
              },

              causes_probables: {
                type: "array",
                maxItems: 3,

                items: {
                  type: "object",
                  additionalProperties: false,

                  properties: {
                    cause: {
                      type: "string",
                    },

                    probabilite: {
                      type: "string",
                      enum: ["elevee", "moyenne", "faible"],
                    },

                    pourquoi: {
                      type: "string",
                    },

                    signes_a_verifier: {
                      type: "string",
                    },
                  },

                  required: [
                    "cause",
                    "probabilite",
                    "pourquoi",
                    "signes_a_verifier",
                  ],
                },
              },

              niveau_confiance: {
                type: "string",
                enum: ["faible", "moyen", "eleve"],
              },

              verifications: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              actions_conseillees: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              actions_a_eviter: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              urgence: {
                type: "string",
                enum: ["surveiller", "agir_bientot", "agir_rapidement"],
              },

              question_suivi: {
                type: "string",
              },
            },

            required: [
              "observations_visibles",
              "resume",
              "causes_probables",
              "niveau_confiance",
              "verifications",
              "actions_conseillees",
              "actions_a_eviter",
              "urgence",
              "question_suivi",
            ],
          },
        },
      },
    });

    if (!response.output_text) {
      throw new Error("Aucun diagnostic reçu.");
    }

    const diagnostic = JSON.parse(response.output_text);

    return NextResponse.json(diagnostic);
  } catch (error) {
    console.error("Erreur diagnostic plante :", error);

    return NextResponse.json(
      {
        erreur: "Impossible d'analyser le problème pour le moment.",
      },
      { status: 500 }
    );
  }
}