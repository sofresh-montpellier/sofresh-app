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
    const contexteCulture = body.contexteCulture ?? {};

    const modeCulture =
      contexteCulture.modeCulture === "pot_bac"
        ? "pot_bac"
        : contexteCulture.modeCulture === "pleine_terre"
          ? "pleine_terre"
          : "inconnu";

    const typeSite =
      contexteCulture.typeSite === "interieur"
        ? "interieur"
        : contexteCulture.typeSite === "exterieur"
          ? "exterieur"
          : "inconnu";

    const siteNom =
      typeof contexteCulture.siteNom === "string" &&
      contexteCulture.siteNom.trim()
        ? contexteCulture.siteNom.trim()
        : "Non renseigné";

    const pot =
      modeCulture === "pot_bac" && contexteCulture.pot
        ? contexteCulture.pot
        : null;

    const interieur =
      typeSite === "interieur" && contexteCulture.interieur
        ? contexteCulture.interieur
        : null;

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
CONTEXTE DE CULTURE
========================

Le contexte fourni par Feuillia décrit la situation RÉELLE de cette plante chez l'utilisateur.

Règles impératives :
- Adapte tous les conseils à ce contexte réel.
- Si le mode de culture est "pot_bac", donne uniquement les recommandations adaptées à une culture en pot ou bac. Ne propose pas en parallèle une variante pour la pleine terre.
- Si le mode de culture est "pleine_terre", donne uniquement les recommandations adaptées à la pleine terre. Ne propose pas en parallèle une variante pour un pot.
- Si le site est intérieur, ne base pas les conseils sur la pluie, le vent extérieur ou une culture en jardin.
- Si le site est extérieur, ne donne pas de recommandations propres à une plante cultivée à l'intérieur.
- Les caractéristiques du pot et de la lumière intérieure sont des informations de contexte : utilise-les lorsqu'elles modifient réellement le conseil.
- Une information inconnue ou non renseignée ne doit jamais être inventée.
- Ne crée jamais plusieurs programmes de fertilisation simplement pour représenter plusieurs méthodes possibles, plusieurs types d'engrais possibles ou plusieurs modes de culture possibles.
- PERIODES_FERTILISATION doit représenter le programme final retenu pour CETTE plante dans CE contexte.
- Deux périodes de fertilisation ne sont autorisées que si elles correspondent à deux phases saisonnières réellement distinctes et nécessaires, et non à deux variantes du même apport.
- Si une seule stratégie de fertilisation suffit, renvoie une seule période.
- Ne crée jamais deux périodes qui se chevauchent et poursuivent le même objectif nutritif.

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
TEMPÉRATURE ET FROID
========================

TEMPÉRATURE :
Indique :
- la plage de température idéale lorsque cela est pertinent ;
- la température minimale approximative supportée ;
- la résistance au gel ;
- les précautions particulières pour le contexte réel de culture si nécessaire.

TEMPÉRATURE_MIN_TOLEREE :
Donne une température minimale approximative en degrés Celsius que cette espèce peut supporter dans le contexte réel de culture indiqué.

Règles :
- renvoie uniquement un nombre ;
- ce nombre peut être négatif ;
- n'ajoute pas "°C" dans ce champ ;
- utilise une valeur horticole raisonnable et prudente ;
- ne donne pas une précision artificielle au dixième de degré ;
- tiens compte du mode de culture lorsque cela influence réellement la résistance au froid ;
- une plante en pot ou bac peut être plus vulnérable au froid racinaire qu'un sujet comparable en pleine terre ;
- ne prétends pas connaître une limite absolue lorsqu'elle varie selon variété, durée du froid, humidité, vent, âge ou acclimatation.

SEUIL_VIGILANCE_FROID :
Donne la température extérieure minimale prévisionnelle à partir de laquelle Feuillia devrait prévenir l'utilisateur AVANT que la plante atteigne une situation potentiellement dommageable.

Règles :
- renvoie uniquement un nombre en degrés Celsius, sans unité ;
- ce seuil doit être cohérent avec TEMPERATURE_MIN_TOLEREE ;
- il doit normalement être supérieur à la température minimale tolérée afin de laisser une marge d'action ;
- la marge doit être adaptée à la sensibilité réelle de l'espèce et au contexte de culture ;
- n'applique pas arbitrairement la même marge à toutes les plantes ;
- pour une plante très rustique, le seuil peut être négatif ;
- pour une plante tropicale ou très frileuse, il peut être nettement positif ;
- si la plante est cultivée à l'intérieur, indique malgré tout une valeur horticole cohérente pour l'espèce : Feuillia décidera ensuite de ne pas utiliser la météo extérieure pour ce site.

PROTECTION_FROID :
Donne une consigne courte, concrète et directement applicable lorsque le seuil de vigilance froid est atteint.

Adapte impérativement la consigne au contexte réel :
- pot ou bac extérieur : rentrer ou déplacer la plante si cela est pertinent, protéger le contenant et/ou la partie aérienne selon l'espèce ;
- pleine terre : voile d'hivernage, paillage, protection du pied ou aucune protection particulière selon la rusticité réelle ;
- intérieur : indique surtout la température ambiante minimale à préserver et les précautions pertinentes près des vitrages ou courants d'air ;
- ne conseille pas systématiquement un voile, un paillage ou de rentrer une plante si cela n'est pas nécessaire ;
- ne promets jamais qu'une protection garantit la survie à n'importe quelle température.

========================
SUBSTRAT ET DRAINAGE
========================

SUBSTRAT_CONSEILLE :
Donne un conseil court et concret sur le substrat le plus adapté à cette plante.

Le conseil doit être spécifique à l'espèce lorsque c'est pertinent.

Tu peux indiquer par exemple :
- terreau universel de bonne qualité ;
- terreau pour agrumes ;
- terre de bruyère ou substrat acide ;
- substrat pour cactus et succulentes ;
- mélange riche mais drainant ;
- terreau léger avec perlite ou pouzzolane ;
- terre de jardin amendée ;
- mélange à base d'écorces pour certaines plantes lorsque cela est réellement adapté.

IMPORTANT :
- N'invente pas une recette compliquée si elle n'est pas utile.
- Évite les pourcentages trop précis lorsque plusieurs mélanges peuvent convenir.
- Si la plante tolère plusieurs types de substrats, donne le choix le plus simple et le plus sûr pour un jardinier amateur.
- Indique clairement si la plante a besoin d'un sol acide, calcaire, neutre, riche, pauvre, humifère ou très drainant lorsque c'est déterminant.
- Le texte doit être court, pratique et directement exploitable.

DRAINAGE :
Choisis uniquement l'une des trois valeurs suivantes :
- faible
- moyen
- fort

Interprétation :
- faible : plante appréciant un substrat qui conserve assez bien l'humidité, sans eau stagnante ;
- moyen : plante demandant un sol ordinaire correctement drainé ;
- fort : plante très sensible à l'excès d'eau ou nécessitant un substrat particulièrement drainant.

Ne mets aucun autre texte dans ce champ.

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

PERIODES_TAILLE :
Ce tableau sert uniquement à planifier automatiquement les rappels Feuillia.

Pour chaque période de taille réellement utile dans l'année, ajoute un objet avec :
- mois_debut : nombre de 1 à 12 ;
- mois_fin : nombre de 1 à 12 ;
- libelle : intitulé court et clair de la période ;
- type_taille : rôle de cette intervention, par exemple "taille_principale", "taille_ete", "taille_hiver", "entretien", "formation" ou un libellé court pertinent.

Règles :
- Une plante peut avoir zéro, une ou plusieurs périodes de taille.
- Exemple glycine : une période février-mars pour la taille d'hiver et une période juillet-août pour la taille d'été.
- Une période de taille doit correspondre à une vraie intervention de taille saisonnière utile à programmer : réduction de rameaux ou tiges, taille de formation, taille principale, taille d'été ou taille d'hiver lorsqu'elle est réellement recommandée pour cette espèce.
- N'inclus JAMAIS dans periodes_taille : rempotage, division, transplantation, plantation, récolte, fertilisation, arrosage, traitement, hivernage, changement de pot, séparation de rejets/drageons, multiplication, simple nettoyage ou suppression occasionnelle de parties mortes.
- Ne crée PAS de rappel calendaire pour les opérations légères ou facultatives pouvant être faites au fil de l'année : fleurs fanées, feuilles/frondes sèches, bois mort, pincements facultatifs, léger éclaircissage, retouches esthétiques, façonnage léger, suppression ponctuelle de rejets.
- Ces opérations légères peuvent être expliquées dans COMMENT_TAILLER ou PRECAUTIONS_TAILLE, mais ne doivent pas apparaître dans periodes_taille.
- Ne transforme pas une opération de culture ou d'entretien général en "taille" simplement parce qu'elle a lieu à une période précise.
- Si plusieurs périodes existent, elles doivent correspondre à des interventions réellement distinctes et importantes pour la plante. Exemple typique : la glycine avec une vraie taille d'hiver et une vraie taille d'été.
- Limite periodes_taille au minimum utile : en général 0 ou 1 période ; 2 seulement si l'espèce a réellement deux tailles saisonnières distinctes et reconnues.
- Ne duplique pas une même taille sous deux libellés différents.
- Si une période tient sur un seul mois, mets le même mois dans mois_debut et mois_fin.
- Si la taille dépend uniquement d'un événement impossible à convertir proprement en mois sans autre information, par exemple "après la floraison" sans mois fiable, ne crée pas de période artificielle.
- Si aucune taille saisonnière n'est nécessaire, renvoie un tableau vide.
- Si l'entretien peut se faire toute l'année sans fenêtre principale, renvoie un tableau vide.
- N'invente jamais une période calendaire uniquement pour remplir le tableau.
- Avant de renvoyer periodes_taille, vérifie chaque entrée avec cette question : "Est-ce bien une coupe de la plante que l'utilisateur doit effectuer à cette période ?" Si la réponse est non, retire l'entrée.

GUIDE_DETAILLE_TAILLE :
En plus des champs de taille déjà demandés, fournis un guide pratique réellement actionnable.

BRANCHES_A_COUPER :
Décris précisément quelles parties retirer en priorité : bois mort, branches faibles, rameaux ayant fleuri, pousses trop longues, branches qui se croisent, rejets, gourmands, etc. Adapte à l'espèce.

EMPLACEMENT_COUPE :
Explique où placer la coupe : au-dessus d'un bourgeon, au ras d'une branche, au niveau d'une ramification, sur bois de l'année ou ancien bois, distance approximative du bourgeon si pertinente. Ne donne pas de règle générique si l'espèce exige autre chose.

QUANTITE_A_RETIRER :
Indique combien retirer de façon pratique : quelques centimètres, un tiers, moitié, rabattage plus fort, seulement les extrémités, etc. Si aucun pourcentage fiable n'existe, dis-le clairement au lieu d'inventer.

ELEMENTS_A_CONSERVER :
Précise ce qu'il faut absolument garder : charpentières, jeunes pousses florifères, bourgeons, vieux bois productif, tiges principales, etc.

TAILLE_JEUNE_ADULTE :
Explique les différences entre une jeune plante en formation et une plante adulte déjà établie.

ORDRE_PRIORITES_TAILLE :
Donne un ordre simple des opérations, par exemple :
1. retirer le mort ou malade ;
2. supprimer ce qui se croise ;
3. aérer ;
4. raccourcir pour la forme ;
5. finir par les retouches.
Adapte toujours cet ordre à l'espèce.

OUTILS_TAILLE :
Indique les outils utiles : sécateur, coupe-branches, scie, gants, désinfection de la lame si pertinente.

APRES_TAILLE :
Explique ce qu'il faut faire juste après : arrosage ou non, engrais ou non, protection contre gel/fort soleil, surveillance des plaies, évacuation des déchets malades, etc.

Règles du guide détaillé :
- Sois concret et spécifique à l'espèce.
- Évite les phrases vagues du type "tailler légèrement" sans expliquer comment.
- Si une plante ne doit pratiquement pas être taillée, dis-le explicitement dans ces champs au lieu d'inventer une méthode.
- N'encourage pas une taille sévère si l'espèce la supporte mal.
- Signale clairement les espèces qui ne repartent pas bien sur vieux bois.

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
FERTILISATION
========================

La fertilisation doit être pratique, sûre et réellement adaptée à l'espèce.

Commence par déterminer si cette plante a réellement besoin d'une fertilisation régulière.
Ne crée pas de calendrier d'engrais si la plante est peu exigeante, si un apport ponctuel suffit ou si aucune période fiable n'est pertinente.

PERIODES_FERTILISATION :
Ce tableau sert à créer les rappels Feuillia.

Pour chaque période de fertilisation réellement utile, ajoute un objet avec :
- mois_debut : nombre de 1 à 12 ;
- mois_fin : nombre de 1 à 12 ;
- libelle : intitulé court et clair ;
- type_apport : rôle de l'apport, par exemple "croissance", "floraison", "fructification", "entretien", "reprise" ;
- type_engrais : type conseillé, par exemple "engrais équilibré", "engrais agrumes", "engrais plantes fleuries", "compost mûr", etc. ;
- forme_engrais : "liquide", "poudre soluble", "granules", "libération lente", "bâtonnets", "organique", "minéral" ou autre forme pertinente ;
- dosage : indique un dosage pratique si un dosage fiable peut être donné. Si le dosage dépend trop du produit commercial, indique clairement "Suivre le dosage du fabricant" au lieu d'inventer une quantité ;
- methode_application : explique concrètement comment l'appliquer ;
- frequence : fréquence pendant la période, formulée clairement pour l'utilisateur ;
- intervalle_jours : nombre entier de jours entre deux apports lorsque l'apport doit être répété à intervalle régulier pendant cette période ; sinon null ;
- duree_action : durée d'action approximative lorsque pertinente, sinon indique qu'elle dépend du produit ;
- precautions : principales erreurs à éviter.

Règles :
- Une plante peut avoir zéro, une ou plusieurs périodes de fertilisation.
- N'ajoute pas de période artificielle uniquement pour remplir le tableau.
- Ne recommande pas d'engrais si l'espèce est peu exigeante et qu'un amendement ponctuel ou aucun apport suffit.
- Ne confonds pas fertilisation et rempotage, paillage, arrosage, taille ou traitement.
- Pour un engrais liquide ou soluble, précise qu'il s'applique généralement sur substrat déjà humide lorsque c'est pertinent.
- Pour un engrais à libération lente, n'invente pas une fréquence mensuelle : tiens compte de sa durée d'action.
- INTERVALLE_JOURS doit être utilisé uniquement lorsqu'un rythme régulier est réellement pertinent.
- Exemples : "tous les 15 jours" => 15 ; "toutes les 4 semaines" => 28 ; "tous les mois" => 30.
- Pour un apport unique, un apport seulement au début de la période, une fréquence dépendant du produit ou une libération lente sans répétition fixe, renvoie null.
- N'invente jamais un intervalle uniquement pour permettre la planification.
- Ne recommande jamais deux fertilisations simultanées qui feraient doublon.
- Si la fertilisation doit être interrompue en hiver ou en période de repos, indique-le clairement.
- Si la plante est sensible au surdosage, aux sels ou aux racines brûlées, mentionne-le dans precautions.
- Si le dosage varie fortement selon la marque ou la concentration, ne donne pas de grammes ou millilitres arbitraires.
- Limite le calendrier au minimum utile : en général 0, 1 ou 2 périodes réellement distinctes.
- Avant de renvoyer une période, vérifie : "Est-ce réellement un apport nutritif que l'utilisateur doit effectuer à cette période ?" Si non, retire-la.

========================
CONSEIL D'ENTRETIEN
========================

Donne quelques conseils complémentaires vraiment utiles :
- fertilisation ;
- rempotage ;
- paillage ;
- humidité ;
- surveillance particulière ;
- autres points importants pour cette espèce.

Ne répète pas le conseil de substrat déjà donné dans SUBSTRAT_CONSEILLE.
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

CONTEXTE RÉEL DE CULTURE :
- Mode de culture : ${modeCulture}
- Type de site : ${typeSite}
- Nom du site : ${siteNom}
- Pot / bac : ${
        pot
          ? JSON.stringify({
              diametre_cm: pot.diametreCm ?? null,
              hauteur_cm: pot.hauteurCm ?? null,
              volume_litres: pot.volumeLitres ?? null,
              matiere: pot.matiere ?? null,
              trous_drainage: pot.trousDrainage ?? null,
            })
          : "Non concerné"
      }
- Conditions intérieures : ${
        interieur
          ? JSON.stringify({
              distance_fenetre_m: interieur.distanceFenetreM ?? null,
              orientation_fenetre: interieur.orientationFenetre ?? null,
              luminosite_piece: interieur.luminositePiece ?? null,
              type_lumiere: interieur.typeLumiere ?? null,
              obstacle_lumiere: interieur.obstacleLumiere ?? null,
            })
          : "Non concerné"
      }

Produis UNE fiche cohérente correspondant uniquement à ce contexte.
N'énumère pas des variantes destinées à d'autres modes de culture.
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

              substrat_conseille: {
                type: "string",
              },

              drainage: {
                type: "string",
                enum: ["faible", "moyen", "fort"],
              },

              periode_taille: {
                type: "string",
              },

              periodes_taille: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    mois_debut: {
                      type: "integer",
                      minimum: 1,
                      maximum: 12,
                    },
                    mois_fin: {
                      type: "integer",
                      minimum: 1,
                      maximum: 12,
                    },
                    libelle: {
                      type: "string",
                    },
                    type_taille: {
                      type: "string",
                    },
                  },
                  required: [
                    "mois_debut",
                    "mois_fin",
                    "libelle",
                    "type_taille",
                  ],
                },
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

              branches_a_couper: {
                type: "string",
              },

              emplacement_coupe: {
                type: "string",
              },

              quantite_a_retirer: {
                type: "string",
              },

              elements_a_conserver: {
                type: "string",
              },

              taille_jeune_adulte: {
                type: "string",
              },

              ordre_priorites_taille: {
                type: "string",
              },

              outils_taille: {
                type: "string",
              },

              apres_taille: {
                type: "string",
              },

              periodes_fertilisation: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    mois_debut: {
                      type: "integer",
                      minimum: 1,
                      maximum: 12,
                    },
                    mois_fin: {
                      type: "integer",
                      minimum: 1,
                      maximum: 12,
                    },
                    libelle: {
                      type: "string",
                    },
                    type_apport: {
                      type: "string",
                    },
                    type_engrais: {
                      type: "string",
                    },
                    forme_engrais: {
                      type: "string",
                    },
                    dosage: {
                      type: "string",
                    },
                    methode_application: {
                      type: "string",
                    },
                    frequence: {
                      type: "string",
                    },

                    intervalle_jours: {
                      anyOf: [
                        {
                          type: "integer",
                          minimum: 1,
                          maximum: 365,
                        },
                        {
                          type: "null",
                        },
                      ],
                    },

                    duree_action: {
                      type: "string",
                    },
                    precautions: {
                      type: "string",
                    },
                  },
                  required: [
                    "mois_debut",
                    "mois_fin",
                    "libelle",
                    "type_apport",
                    "type_engrais",
                    "forme_engrais",
                    "dosage",
                    "methode_application",
                    "frequence",
                    "intervalle_jours",
                    "duree_action",
                    "precautions",
                  ],
                },
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
              "temperature_min_toleree",
              "seuil_vigilance_froid",
              "protection_froid",
              "substrat_conseille",
              "drainage",
              "periode_taille",
              "periodes_taille",
              "pourquoi_taille",
              "comment_tailler",
              "intensite_taille",
              "precautions_taille",
              "branches_a_couper",
              "emplacement_coupe",
              "quantite_a_retirer",
              "elements_a_conserver",
              "taille_jeune_adulte",
              "ordre_priorites_taille",
              "outils_taille",
              "apres_taille",
              "periodes_fertilisation",
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