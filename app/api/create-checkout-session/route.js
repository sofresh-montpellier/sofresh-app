import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function parseTimeToMinutes(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s*h\s*/i, ":");

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesForApp(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")} h ${String(
    minutes
  ).padStart(2, "0")}`;
}

function generatePickupTimes(
  firstPickupTime,
  lastPickupTime,
  slotInterval
) {
  const firstMinutes = parseTimeToMinutes(firstPickupTime);
  const lastMinutes = parseTimeToMinutes(lastPickupTime);
  const interval = Number(slotInterval);

  if (
    firstMinutes === null ||
    lastMinutes === null ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    firstMinutes > lastMinutes
  ) {
    return [];
  }

  const times = [];

  for (
    let current = firstMinutes;
    current <= lastMinutes;
    current += interval
  ) {
    times.push(formatMinutesForApp(current));
  }

  return times;
}

function getParisDateTime() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const getPart = (type) =>
    Number(
      parts.find((part) => part.type === type)?.value || 0
    );

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return {
    isoDate: `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
  };
}

function getPickupWeekday(pickupDate) {
  const [year, month, day] = pickupDate
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  return date.getUTCDay();
}

function isOpenForWeekday(settings, weekday) {
  const openDays = {
    0: settings.open_sunday,
    1: settings.open_monday,
    2: settings.open_tuesday,
    3: settings.open_wednesday,
    4: settings.open_thursday,
    5: settings.open_friday,
    6: settings.open_saturday,
  };

  return Boolean(openDays[weekday]);
}

export async function POST(request) {
  let pendingCheckoutId = null;

  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !stripeSecretKey ||
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      throw new Error(
        "Configuration serveur incomplète."
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const body = await request.json();

    // Récupération éventuelle du client connecté
    const authHeader = request.headers.get("authorization");

    let userId = null;

    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.slice(7);

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(accessToken);

      if (!userError && user) {
        userId = user.id;
      }
    }

    const customerName = String(
      body.customer_name || ""
    ).trim();

    const customerPhone = String(
      body.customer_phone || ""
    ).trim();

    const pickupDate = String(
      body.pickup_date || ""
    ).trim();

    const pickupTime = String(
      body.pickup_time || ""
    ).trim();

    const requestedItems = Array.isArray(body.items)
      ? body.items
      : [];

    if (
      customerName.length < 1 ||
      customerName.length > 100 ||
      customerPhone.length < 6 ||
      customerPhone.length > 30 ||
      !isValidDate(pickupDate) ||
      !pickupTime ||
      requestedItems.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Les informations de commande sont incomplètes.",
        },
        { status: 400 }
      );
    }

    /*
     * Chargement des paramètres du Click & Collect
     */
    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (settingsError || !settings) {
      console.error(
        "Erreur chargement paramètres :",
        settingsError
      );

      return NextResponse.json(
        {
          error:
            "Les réglages du Click & Collect sont momentanément indisponibles.",
        },
        { status: 503 }
      );
    }

    /*
     * Vérification de l’état général du service
     */
    if (!settings.restaurant_open) {
      return NextResponse.json(
        {
          error:
            "Le Click & Collect est actuellement fermé.",
        },
        { status: 403 }
      );
    }

    const parisNow = getParisDateTime();

    /*
     * Interdiction de commander pour une date passée
     */
    if (pickupDate < parisNow.isoDate) {
      return NextResponse.json(
        {
          error:
            "La date de retrait sélectionnée est dépassée.",
        },
        { status: 400 }
      );
    }

    /*
     * Vérification du jour d’ouverture
     */
    const pickupWeekday =
      getPickupWeekday(pickupDate);

    if (
      !isOpenForWeekday(settings, pickupWeekday)
    ) {
      return NextResponse.json(
        {
          error:
            "Le Click & Collect est fermé pour le jour sélectionné.",
        },
        { status: 409 }
      );
    }

    /*
     * Vérification de l’heure limite pour une commande
     * retirée aujourd’hui
     */
    if (pickupDate === parisNow.isoDate) {
      const cutoffMinutes = parseTimeToMinutes(
        settings.cutoff_time
      );

      if (
        cutoffMinutes === null ||
        parisNow.minutes >= cutoffMinutes
      ) {
        return NextResponse.json(
          {
            error:
              "L’heure limite de commande pour aujourd’hui est dépassée.",
          },
          { status: 409 }
        );
      }
    }

    /*
     * Génération et validation des créneaux selon les paramètres
     */
    const allowedPickupTimes =
      generatePickupTimes(
        settings.first_pickup_time,
        settings.last_pickup_time,
        settings.slot_interval
      );

    if (
      allowedPickupTimes.length === 0 ||
      !allowedPickupTimes.includes(pickupTime)
    ) {
      return NextResponse.json(
        {
          error:
            "Le créneau de retrait sélectionné n’est plus disponible.",
        },
        { status: 409 }
      );
    }

    /*
     * Vérification de la capacité du créneau
     */
    const slotCapacity = Number(
      settings.slot_capacity
    );

    if (
      !Number.isInteger(slotCapacity) ||
      slotCapacity < 1
    ) {
      return NextResponse.json(
        {
          error:
            "La capacité des créneaux est mal configurée.",
        },
        { status: 503 }
      );
    }

    const {
      count: confirmedOrdersCount,
      error: countError,
    } = await supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("pickup_date", pickupDate)
      .eq("pickup_time", pickupTime)
      .neq("status", "Annulée");

    if (countError) {
      console.error(
        "Erreur comptage commandes :",
        countError
      );

      return NextResponse.json(
        {
          error:
            "La disponibilité du créneau ne peut pas être vérifiée.",
        },
        { status: 503 }
      );
    }

    /*
     * Les paiements en cours récents réservent également une place
     * pendant 30 minutes pour éviter de dépasser la capacité.
     */
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const {
      count: pendingCheckoutsCount,
      error: pendingCountError,
    } = await supabaseAdmin
      .from("pending_checkouts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("pickup_date", pickupDate)
      .eq("pickup_time", pickupTime)
      .eq("status", "pending")
      .gte("created_at", thirtyMinutesAgo);

    if (pendingCountError) {
      console.error(
        "Erreur comptage paiements en attente :",
        pendingCountError
      );

      return NextResponse.json(
        {
          error:
            "La disponibilité du créneau ne peut pas être vérifiée.",
        },
        { status: 503 }
      );
    }

    const reservedPlaces =
      Number(confirmedOrdersCount || 0) +
      Number(pendingCheckoutsCount || 0);

    if (reservedPlaces >= slotCapacity) {
      return NextResponse.json(
        {
          error:
            "Ce créneau est complet. Choisissez une autre heure.",
        },
        { status: 409 }
      );
    }

    /*
     * Validation des produits et des quantités
     *
     * IMPORTANT :
     * - Les produits classiques gardent le fonctionnement existant.
     * - Une formule conserve maintenant ses choix
     *   (salade / boisson / dessert, etc.).
     * - Les choix d'une formule sont revalidés côté serveur
     *   avant d'être enregistrés.
     */

    const requestedProductIds = [
      ...new Set(
        requestedItems
          .map((item) => Number(item.id))
          .filter(Number.isInteger)
      ),
    ];

    for (const item of requestedItems) {
      const productId = Number(item.id);
      const quantity = Number(item.qty);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        return NextResponse.json(
          {
            error:
              "Un produit ou une quantité est invalide.",
          },
          { status: 400 }
        );
      }
    }

    const {
      data: products,
      error: productsError,
    } = await supabaseAdmin
      .from("products")
      .select("id,name,price,available,category")
      .in("id", requestedProductIds)
      .eq("available", true);

    if (
      productsError ||
      !products ||
      products.length !== requestedProductIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Un produit n’est plus disponible.",
        },
        { status: 409 }
      );
    }

    const productMap = new Map(
      products.map((product) => [
        String(product.id),
        product,
      ])
    );

    const items = [];

    /*
     * Produits classiques :
     * on continue à regrouper les mêmes produits
     * pour garder le comportement historique.
     */
    const normalQuantities = new Map();

    for (const requestedItem of requestedItems) {
      const productId = Number(requestedItem.id);
      const quantity = Number(requestedItem.qty);
      const product = productMap.get(String(productId));

      const isFormula =
        requestedItem.formula === true;

      if (!isFormula) {
        normalQuantities.set(
          productId,
          (normalQuantities.get(productId) || 0) +
            quantity
        );

        continue;
      }

      /*
       * Validation d'une formule.
       */
      const formulaSelections = Array.isArray(
        requestedItem.formula_selections
      )
        ? requestedItem.formula_selections
        : [];

      if (formulaSelections.length === 0) {
        return NextResponse.json(
          {
            error:
              "La composition d’une formule est incomplète.",
          },
          { status: 400 }
        );
      }

      const {
        data: formulaSteps,
        error: formulaStepsError,
      } = await supabaseAdmin
        .from("formula_steps")
        .select(
          "id,formula_product_id,name,display_order,required_quantity"
        )
        .eq("formula_product_id", productId)
        .order("display_order", {
          ascending: true,
        });

      if (
        formulaStepsError ||
        !formulaSteps ||
        formulaSteps.length === 0
      ) {
        console.error(
          "Erreur étapes formule :",
          formulaStepsError
        );

        return NextResponse.json(
          {
            error:
              "Cette formule n’est plus disponible.",
          },
          { status: 409 }
        );
      }

      const stepIds = formulaSteps.map(
        (step) => step.id
      );

      const {
        data: allowedRows,
        error: allowedRowsError,
      } = await supabaseAdmin
        .from("formula_step_products")
        .select("formula_step_id,product_id")
        .in("formula_step_id", stepIds);

      if (allowedRowsError) {
        console.error(
          "Erreur produits autorisés formule :",
          allowedRowsError
        );

        return NextResponse.json(
          {
            error:
              "La composition de cette formule ne peut pas être vérifiée.",
          },
          { status: 503 }
        );
      }

      const selectedProductIds = [
        ...new Set(
          formulaSelections
            .map((selection) =>
              Number(selection.product_id)
            )
            .filter(Number.isInteger)
        ),
      ];

      const {
        data: selectedProducts,
        error: selectedProductsError,
      } = await supabaseAdmin
        .from("products")
        .select("id,name,image_url,available")
        .in("id", selectedProductIds)
        .eq("available", true);

      if (
        selectedProductsError ||
        !selectedProducts ||
        selectedProducts.length !==
          selectedProductIds.length
      ) {
        return NextResponse.json(
          {
            error:
              "Un des choix de votre formule n’est plus disponible.",
          },
          { status: 409 }
        );
      }

      const selectedProductMap = new Map(
        selectedProducts.map((selectedProduct) => [
          String(selectedProduct.id),
          selectedProduct,
        ])
      );

      const validatedSelections = [];

      for (const step of formulaSteps) {
        const submittedSelection =
          formulaSelections.find(
            (selection) =>
              String(selection.step_id) ===
              String(step.id)
          );

        if (!submittedSelection) {
          return NextResponse.json(
            {
              error: `Choisissez votre ${String(
                step.name || "produit"
              ).toLowerCase()}.`,
            },
            { status: 400 }
          );
        }

        const selectedProductId = Number(
          submittedSelection.product_id
        );

        const isAllowed = (allowedRows || []).some(
          (row) =>
            String(row.formula_step_id) ===
              String(step.id) &&
            String(row.product_id) ===
              String(selectedProductId)
        );

        const selectedProduct =
          selectedProductMap.get(
            String(selectedProductId)
          );

        if (!isAllowed || !selectedProduct) {
          return NextResponse.json(
            {
              error:
                "Un choix de la formule n’est plus autorisé.",
            },
            { status: 409 }
          );
        }

        validatedSelections.push({
          step_id: step.id,
          step_name: step.name,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          image_url:
            selectedProduct.image_url || "",
        });
      }

      items.push({
        id: product.id,
        name: product.name,
        unit_price: Number(product.price),
        qty: quantity,
        formula: true,
        formula_name:
          String(
            requestedItem.formula_name ||
              product.name
          ).trim() || product.name,
        formula_selections:
          validatedSelections,
      });
    }

    /*
     * Ajout des produits classiques après regroupement.
     */
    for (const [
      productId,
      quantity,
    ] of normalQuantities.entries()) {
      const product = productMap.get(
        String(productId)
      );

      if (!product) {
        continue;
      }

      items.push({
        id: product.id,
        name: product.name,
        unit_price: Number(product.price),
        qty: quantity,
      });
    }

    const total = items.reduce(
      (sum, item) =>
        sum + item.unit_price * item.qty,
      0
    );

    /*
     * Création de la commande provisoire
     */
    const {
      data: pendingCheckout,
      error: pendingError,
    } = await supabaseAdmin
      .from("pending_checkouts")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        user_id: userId,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        items,
        total,
        status: "pending",
      })
      .select("id")
      .single();

    if (pendingError || !pendingCheckout) {
      console.error(
        "Erreur pending_checkouts :",
        pendingError
      );

      return NextResponse.json(
        {
          error:
            "Le paiement ne peut pas être préparé.",
        },
        { status: 500 }
      );
    }

    pendingCheckoutId = pendingCheckout.id;

    /*
     * Création de la session Stripe
     */
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",
        locale: "fr",

        // On limite Stripe aux paiements par carte.
        // Apple Pay / Google Pay restent proposés
        // sur les appareils compatibles.
        payment_method_types: ["card"],

        line_items: items.map((item) => {
          const formulaDescription =
            item.formula &&
            Array.isArray(item.formula_selections)
              ? item.formula_selections
                  .map(
                    (selection) =>
                      `${selection.step_name} : ${selection.product_name}`
                  )
                  .join(" • ")
              : "";

          return {
            quantity: item.qty,

            price_data: {
              currency: "eur",
              unit_amount: Math.round(
                item.unit_price * 100
              ),

              product_data: {
                name: item.name,
                ...(formulaDescription
                  ? {
                      description:
                        formulaDescription.slice(
                          0,
                          500
                        ),
                    }
                  : {}),
              },
            },
          };
        }),

        metadata: {
          pending_checkout_id: String(
            pendingCheckoutId
          ),
        },

        success_url:
          `${request.nextUrl.origin}/payment-success` +
          "?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${request.nextUrl.origin}/payment-cancel`,
      });

    /*
     * Enregistrement de l’identifiant Stripe
     */
    const { error: updateError } =
      await supabaseAdmin
        .from("pending_checkouts")
        .update({
          stripe_session_id: session.id,
        })
        .eq("id", pendingCheckoutId);

    if (updateError) {
      console.error(
        "Session Stripe créée, mais pending_checkouts non actualisé :",
        updateError
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur Stripe :", error);

    return NextResponse.json(
      {
        error:
          "Le paiement n’a pas pu être initialisé.",
      },
      { status: 500 }
    );
  }
}