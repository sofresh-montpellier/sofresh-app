import Stripe from "stripe";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Formate la date de retrait.
 * Exemple :
 * 2026-09-07 -> Lun. 7 sept.
 */
function formatPickupDate(dateString) {
  if (!dateString) {
    return "Date à confirmer";
  }

  try {
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day, 12, 0, 0)
    );

    const formatted = new Intl.DateTimeFormat(
      "fr-FR",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }
    ).format(date);

    return (
      formatted.charAt(0).toUpperCase() +
      formatted.slice(1)
    );
  } catch {
    return dateString;
  }
}

/*
 * Formate le prix.
 */
function formatPrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(amount);
}

/*
 * Envoie la notification "Nouvelle commande"
 * à tous les téléphones admins inscrits.
 *
 * La notification contient également le nombre
 * réel de commandes encore à traiter afin que
 * la pastille de l'application soit synchronisée.
 *
 * Une erreur de notification ne bloque jamais
 * la création de la commande.
 */
async function sendNewOrderNotification(
  supabase,
  order
) {
  try {
    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error(
        "Notification commande non envoyée : configuration VAPID incomplète."
      );
      return;
    }

    webpush.setVapidDetails(
      "https://sofresh-app-five.vercel.app",
      publicKey,
      privateKey
    );

    /*
     * Récupère tous les téléphones admins
     * inscrits aux notifications.
     */
    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from("admin_push_subscriptions")
      .select("*");

    if (subscriptionsError) {
      console.error(
        "Impossible de récupérer les abonnements push admins :",
        subscriptionsError
      );
      return;
    }

    if (!subscriptions?.length) {
      console.log(
        "Aucun téléphone admin inscrit aux notifications."
      );
      return;
    }

    /*
     * Compte le nombre réel de commandes
     * encore à traiter.
     *
     * Une commande terminée ou annulée
     * ne doit pas apparaître dans la pastille.
     */
    const {
      count: waitingCount,
      error: waitingCountError,
    } = await supabase
      .from("orders")
      .select("*", {
        count: "exact",
        head: true,
      })
      .not(
        "status",
        "in",
        '("Terminée","Annulée")'
      );

    if (waitingCountError) {
      console.error(
        "Impossible de compter les commandes à traiter :",
        waitingCountError
      );
    }

    /*
     * Au moment où cette fonction est appelée,
     * une nouvelle commande vient d'être créée.
     * On garde donc au minimum 1 si le comptage
     * échoue exceptionnellement.
     */
    const badgeCount = Math.max(
      1,
      Number(waitingCount || 1)
    );

    const customerName =
      order.customer_name?.trim() ||
      "Client So Fresh";

    const pickupDate = formatPickupDate(
      order.pickup_date
    );

    const pickupTime =
      order.pickup_time || "heure à confirmer";

    const total = formatPrice(order.total);

    const bodyParts = [
      customerName,
      total,
      `${pickupDate} à ${pickupTime}`,
    ].filter(Boolean);

    /*
     * badgeCount sera récupéré par public/sw.js
     * pour mettre à jour la pastille de l'icône.
     */
    const payload = JSON.stringify({
      title: "🛒 Nouvelle commande So Fresh",
      body: bodyParts.join(" — "),
      url: "/admin",
      badgeCount,
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );

        sent += 1;
      } catch (pushError) {
        failed += 1;

        console.error(
          "Erreur notification nouvelle commande :",
          pushError
        );

        /*
         * Supprime automatiquement les anciens
         * abonnements qui ne sont plus valides.
         */
        if (
          pushError?.statusCode === 404 ||
          pushError?.statusCode === 410
        ) {
          await supabase
            .from("admin_push_subscriptions")
            .delete()
            .eq(
              "endpoint",
              subscription.endpoint
            );
        }
      }
    }

    console.log(
      `Notifications nouvelle commande : ${sent} envoyée(s), ${failed} échec(s). Pastille : ${badgeCount}.`
    );
  } catch (error) {
    console.error(
      "Erreur générale notification nouvelle commande :",
      error
    );
  }
}

/*
 * Crédite la fidélité après paiement Stripe confirmé.
 *
 * Protection anti-double crédit :
 * loyalty_events.stripe_session_id est UNIQUE.
 * Si Stripe renvoie le même webhook,
 * aucun point n'est ajouté une 2e fois.
 */
async function applyLoyalty(
  supabase,
  pendingCheckout,
  stripeSessionId
) {
  const userId =
    pendingCheckout.user_id;

  const formulaCount = Math.max(
    0,
    Number(
      pendingCheckout.loyalty_formula_count || 0
    )
  );

  if (!userId || formulaCount <= 0) {
    return;
  }

  /*
   * On tente d'enregistrer le paiement
   * dans le journal fidélité.
   *
   * Si stripe_session_id existe déjà,
   * Supabase renvoie 23505.
   */
  const {
    error: eventError,
  } = await supabase
    .from("loyalty_events")
    .insert({
      stripe_session_id:
        stripeSessionId,
      user_id:
        userId,
      formula_count:
        formulaCount,
    });

  if (eventError) {
    if (eventError.code === "23505") {
      console.log(
        "Fidélité déjà créditée pour ce paiement Stripe."
      );
      return;
    }

    throw eventError;
  }

  /*
   * Lecture du compteur actuel.
   * Pas de ligne = 0/10.
   */
  const {
    data: loyaltyAccount,
    error: loyaltyReadError,
  } = await supabase
    .from("loyalty_accounts")
    .select("progress")
    .eq("user_id", userId)
    .maybeSingle();

  if (loyaltyReadError) {
    throw loyaltyReadError;
  }

  const currentProgress = Math.max(
    0,
    Math.min(
      9,
      Number(
        loyaltyAccount?.progress || 0
      )
    )
  );

  /*
   * Le cycle repart automatiquement à 0
   * chaque fois qu'on atteint 10.
   *
   * Exemples :
   * 8 + 1 = 9
   * 9 + 1 = 0
   * 9 + 3 = 2
   */
  const nextProgress =
    (currentProgress + formulaCount) % 10;

  const {
    error: loyaltyUpdateError,
  } = await supabase
    .from("loyalty_accounts")
    .upsert(
      {
        user_id: userId,
        progress: nextProgress,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  if (loyaltyUpdateError) {
    /*
     * Si l'update échoue, on supprime
     * l'événement pour permettre à Stripe
     * de retenter proprement.
     */
    await supabase
      .from("loyalty_events")
      .delete()
      .eq(
        "stripe_session_id",
        stripeSessionId
      );

    throw loyaltyUpdateError;
  }

  console.log(
    `Fidélité mise à jour : ${currentProgress}/10 -> ${nextProgress}/10 (${formulaCount} formule(s)).`
  );
}

export async function POST(request) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const stripeWebhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeSecretKey ||
    !stripeWebhookSecret ||
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    console.error(
      "Variables serveur manquantes pour le webhook Stripe."
    );

    return new Response(
      "Configuration serveur incomplète",
      { status: 500 }
    );
  }

  const stripe = new Stripe(
    stripeSecretKey
  );

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const body = Buffer.from(
    await request.arrayBuffer()
  );

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return new Response(
      "Signature Stripe absente",
      { status: 400 }
    );
  }

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
  } catch (error) {
    console.error(
      "Signature webhook invalide :",
      error.message
    );

    return new Response(
      `Webhook Error: ${error.message}`,
      { status: 400 }
    );
  }

  if (
    event.type !==
    "checkout.session.completed"
  ) {
    return new Response(
      "Événement ignoré",
      { status: 200 }
    );
  }

  try {
    const session =
      event.data.object;

    if (
      session.payment_status !== "paid"
    ) {
      return new Response(
        "Paiement non confirmé",
        { status: 200 }
      );
    }

    const pendingCheckoutId =
      session.metadata
        ?.pending_checkout_id;

    if (!pendingCheckoutId) {
      console.error(
        "pending_checkout_id absent"
      );

      return new Response(
        "Identifiant de commande absent",
        { status: 400 }
      );
    }

    const {
      data: pendingCheckout,
      error: pendingError,
    } = await supabase
      .from("pending_checkouts")
      .select("*")
      .eq(
        "id",
        pendingCheckoutId
      )
      .single();

    if (
      pendingError ||
      !pendingCheckout
    ) {
      console.error(
        "Commande provisoire introuvable :",
        pendingError
      );

      return new Response(
        "Commande provisoire introuvable",
        { status: 500 }
      );
    }

    /*
     * Si le checkout est déjà entièrement traité,
     * aucun doublon.
     */
    if (
      pendingCheckout.status === "paid"
    ) {
      return new Response(
        "Commande déjà traitée",
        { status: 200 }
      );
    }

    /*
     * Vérifie si la commande existe déjà
     * avec cette session Stripe.
     * Cela protège aussi les retries du webhook.
     */
    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabase
      .from("orders")
      .select("*")
      .eq(
        "stripe_session_id",
        session.id
      )
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "Erreur vérification commande existante :",
        existingOrderError
      );

      return new Response(
        "Vérification commande impossible",
        { status: 500 }
      );
    }

    let createdOrder =
      existingOrder || null;

    let orderCreatedNow = false;

    if (!createdOrder) {
      const {
        data: insertedOrder,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          customer_name:
            pendingCheckout.customer_name,

          customer_phone:
            pendingCheckout.customer_phone,

          user_id:
            pendingCheckout.user_id,

          pickup_date:
            pendingCheckout.pickup_date,

          pickup_time:
            pendingCheckout.pickup_time,

          items:
            pendingCheckout.items,

          total:
            pendingCheckout.total,

          status: "Nouvelle",

          payment_status: "paid",

          stripe_session_id:
            session.id,
        })
        .select("*")
        .single();

      if (orderError) {
        console.error(
          "Erreur création de la commande :",
          orderError
        );

        return new Response(
          "La commande n’a pas pu être enregistrée",
          { status: 500 }
        );
      }

      createdOrder =
        insertedOrder;

      orderCreatedNow = true;
    }

    /*
     * La fidélité n'est créditée qu'ici,
     * donc uniquement après paiement
     * confirmé Stripe.
     */
    try {
      await applyLoyalty(
        supabase,
        pendingCheckout,
        session.id
      );
    } catch (loyaltyError) {
      console.error(
        "Erreur mise à jour fidélité :",
        loyaltyError
      );

      /*
       * On renvoie 500 pour que Stripe retente.
       * La commande existante sera détectée
       * au prochain passage et ne sera pas recréée.
       */
      return new Response(
        "La fidélité n’a pas pu être mise à jour",
        { status: 500 }
      );
    }

    /*
     * On marque le checkout payé seulement
     * lorsque commande + fidélité sont
     * correctement finalisées.
     */
    const {
      error: updateError,
    } = await supabase
      .from("pending_checkouts")
      .update({
        status: "paid",
        stripe_session_id:
          session.id,
      })
      .eq(
        "id",
        pendingCheckoutId
      );

    if (updateError) {
      console.error(
        "Commande créée mais pending_checkouts non actualisé :",
        updateError
      );

      return new Response(
        "Finalisation de commande impossible",
        { status: 500 }
      );
    }

    console.log(
      "Commande payée et enregistrée dans Supabase."
    );

    /*
     * Notification admin uniquement lors
     * de la création réelle de la commande,
     * pas lors d'un retry Stripe.
     */
    if (
      orderCreatedNow &&
      createdOrder
    ) {
      await sendNewOrderNotification(
        supabase,
        createdOrder
      );
    }

    return new Response(
      "ok",
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Erreur pendant le traitement du webhook :",
      error
    );

    return new Response(
      "Erreur interne du webhook",
      { status: 500 }
    );
  }
}