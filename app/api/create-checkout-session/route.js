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

    const { count: confirmedOrdersCount, error: countError } =
      await supabaseAdmin
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
     */
    const quantities = new Map();

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

      quantities.set(
        productId,
        (quantities.get(productId) || 0) +
          quantity
      );
    }

    const productIds = [...quantities.keys()];

    const {
      data: products,
      error: productsError,
    } = await supabaseAdmin
      .from("products")
      .select("id,name,price,available")
      .in("id", productIds)
      .eq("available", true);

    if (
      productsError ||
      !products ||
      products.length !== productIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Un produit n’est plus disponible.",
        },
        { status: 409 }
      );
    }

    const items = products.map((product) => ({
      id: product.id,
      name: product.name,
      unit_price: Number(product.price),
      qty: quantities.get(product.id),
    }));

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

        line_items: items.map((item) => ({
          quantity: item.qty,

          price_data: {
            currency: "eur",
            unit_amount: Math.round(
              item.unit_price * 100
            ),

            product_data: {
              name: item.name,
            },
          },
        })),

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
