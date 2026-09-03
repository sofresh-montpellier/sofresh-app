import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY absente.");

      return NextResponse.json(
        {
          erreur:
            "Le service de conseils n'est pas configuré.",
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const body = await request.json();

    const nomCommun = body.nomCommun;
    const nomBotanique = body.nomBotanique;

    if (!nomBotanique) {
      return NextResponse.json(
        {
          erreur:
            "Le nom botanique est obligatoire.",
        },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",

      instructions: `
Tu es le moteur de conseils horticoles de l'application Feuillia.

Tu écris en français pour un jardinier amateur.
Les conseils doivent être précis, pratiques, faciles à appliquer et spécifiques à l'espèce identifiée.

IMPORTANT :
- Ne donne pas de texte générique qui pourrait convenir à presque toutes les plantes.
- N'utilise une notion horticole que si elle est réellement pertinente pour cette espèce.
- Ne parle pas de "bois de l'année", "bois ancien", "dormance", "montée de sève", "floraison", "rabattage" ou autres notions similaires si elles ne s'appliquent pas réellement à cette plante.
- Ne compare pas inutilement la plante à des arbustes, arbres ou vivaces d'un autre type.
- Si une notion n'est pas pertinente, ne la mentionne simplement pas.
- Ne répète pas la même information dans plusieurs champs.

========================
ARROSAGE
========================

Indique :
- la fréquence d'arrosage ;
- les différences importantes entre printemps, été, automne et hiver ;
- les différences importantes entre pot et pleine terre ;
- les signes simples permettant de savoir quand arroser ;
- les risques d'excès d'eau lorsque c'est pertinent.

Le texte doit rester pratique et compréhensible.

ARROSAGE_INTERVALLE_JOURS :
Donne aussi un nombre entier correspondant à un intervalle d'arrosage de base en jours.

Cette valeur servira uniquement de base de calcul à Feuillia.

IMPORTANT :
- Elle ne doit pas être considérée comme une règle absolue.
- Elle sera ensuite corrigée selon la météo, la saison, la culture en pot ou en pleine terre et l'exposition du site.
- Choisis une valeur raisonnable et prudente pour une période de croissance normale.
- Donne uniquement un nombre entier.
- Ne mets aucun texte dans ce champ.
- La valeur doit être comprise entre 1 et 60 jours.

Exemples :
- plante très gourmande en eau : 2 ou 3
- plante avec besoins modérés : 5 ou 7
- plante résistante à la sécheresse : 10, 14 ou davantage

========================
LUMIÈRE
========================

Indique :
- soleil, mi-ombre ou ombre ;
- le nombre approximatif d'heures de soleil si cela est pertinent ;
- les éventuelles précautions contre le soleil brûlant ;
- les conséquences d'un manque de lumière.

========================
TEMPÉRATURE
========================

Indique :
- la plage de température idéale lorsque cela est pertinent ;
- la température minimale approximative supportée ;
- la résistance au gel ;
- les précautions particulières pour une culture en pot si nécessaire.

========================
TAILLE
========================

La taille est une information PRIORITAIRE dans Feuillia.

Avant de répondre, identifie le type réel de taille adapté à cette plante.

Cela peut être par exemple :
- taille de formation ;
- taille d'entretien ;
- suppression de feuilles ;
- suppression de fleurs fanées ;
- suppression de bois mort ;
- pincement ;
- rabattage ;
- division ;
- ou aucune véritable taille structurelle.

Ne force jamais une logique de taille d'arbuste sur une plante herbacée, tropicale, succulente, bulbeuse ou rhizomateuse.

PERIODE_TAILLE :
- donne uniquement la période principale recommandée ;
- utilise des mois précis lorsque c'est pertinent ;
- reste très court ;
- idéalement une seule phrase ;
- si la plante ne demande pas de taille saisonnière précise, dis-le clairement.

Exemples de formulations possibles :
- "Février à mars, avant la reprise de végétation."
- "Après la floraison."
- "Toute l'année pour retirer les feuilles abîmées."
- "Pas de taille structurelle nécessaire."

Ne mets PAS les explications ni la méthode dans ce champ.

POURQUOI_TAILLE :
- explique pourquoi cette période ou cette méthode est adaptée à cette espèce ;
- ne parle de floraison que si elle influence réellement la taille ;
- ne parle de bois de l'année ou de bois ancien que pour les plantes ligneuses concernées ;
- ne parle de dormance que si cette notion est réellement pertinente ;
- pour une plante tropicale ou herbacée, explique plutôt les effets sur les feuilles, les tiges, le rhizome, la vigueur ou la croissance si cela est pertinent.

COMMENT_TAILLER :
Explique concrètement :
- quelles parties supprimer ;
- quelles parties conserver ;
- où effectuer les coupes lorsque cela est pertinent ;
- combien raccourcir approximativement si cela s'applique ;
- comment procéder pour l'entretien courant ;
- comment procéder sur une plante jeune si cela change la méthode.

Pour une plante qui ne se taille pas comme un arbuste :
- ne parle pas artificiellement de branches ;
- utilise le vocabulaire adapté : feuilles, pétioles, tiges, hampes florales, rejets, rhizomes, pousses, etc.

Ne réponds jamais simplement "tailler si nécessaire".

INTENSITE_TAILLE :
- donne une réponse courte ;
- adapte le vocabulaire au type de plante ;
- ne parle de taille sévère que si cette pratique est réellement adaptée.

Exemples :
- "Très légère : retirer uniquement les feuilles abîmées."
- "Légère à modérée."
- "Rabattage possible sur sujet adulte."
- "Aucune taille structurelle."

PRECAUTIONS_TAILLE :
Indique clairement :
- ce qu'il ne faut surtout pas couper ;
- les périodes à éviter ;
- les risques de gel si pertinents ;
- les risques liés à la floraison si pertinents ;
- les erreurs de coupe fréquentes ;
- les précautions sanitaires concernant les outils ;
- les éventuelles précautions liées à une sève irritante ou toxique lorsque c'est pertinent.

========================
CONSEIL D'ENTRETIEN
========================

Donne quelques conseils complémentaires vraiment utiles :
- sol ;
- fertilisation ;
- rempotage ;
- paillage ;
- humidité ;
- surveillance particulière ;
- autres points importants pour cette espèce.

Ne répète pas les informations déjà données dans les autres champs.

========================
PRÉCISION ET INCERTITUDE
========================

Si une information dépend fortement :
- du climat ;
- de l'âge de la plante ;
- de la culture en pot ou en pleine terre ;
- de la variété ;
- de la région ;
indique-le clairement.

Ne prétends jamais être certain d'une information horticole incertaine.

Ne donne pas de données excessivement précises lorsqu'elles varient beaucoup selon les conditions de culture.

Le résultat doit donner l'impression d'une fiche réellement adaptée à la plante identifiée, et non d'un modèle générique appliqué à toutes les espèces.
`,

      input: `
Prépare la fiche d'entretien Feuillia pour :

Nom commun : ${nomCommun || "Non renseigné"}

Nom botanique : ${nomBotanique}
`,

      text: {
        format: {
          type: "json_schema",
          name: "fiche_entretien",
          strict: true,

          schema: {
            type: "object",

            properties: {
              arrosage: {
                type: "string",
              },

              arrosage_intervalle_jours: {
                type: "integer",
                minimum: 1,
                maximum: 60,
              },

              lumiere: {
                type: "string",
              },

              temperature: {
                type: "string",
              },

              periode_taille: {
                type: "string",
              },

              pourquoi_taille: {
                type: "string",
              },

              comment_tailler: {
                type: "string",
              },

              intensite_taille: {
                type: "string",
              },

              precautions_taille: {
                type: "string",
              },

              conseil_entretien: {
                type: "string",
              },
            },

            required: [
              "arrosage",
              "arrosage_intervalle_jours",
              "lumiere",
              "temperature",
              "periode_taille",
              "pourquoi_taille",
              "comment_tailler",
              "intensite_taille",
              "precautions_taille",
              "conseil_entretien",
            ],

            additionalProperties: false,
          },
        },
      },
    });

    const contenu = response.output_text;

    if (!contenu) {
      throw new Error("Aucune réponse reçue.");
    }

    const conseils = JSON.parse(contenu);

    return NextResponse.json(conseils);
  } catch (error) {
    console.error("Erreur conseils plante :", error);

    return NextResponse.json(
      {
        erreur:
          "Impossible de générer les conseils de cette plante.",
      },
      { status: 500 }
    );
  }
}