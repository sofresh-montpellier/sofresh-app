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
 * Exemple :
 * 18.9 -> 18,90 €
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

    const payload = JSON.stringify({
      title: "🛒 Nouvelle commande So Fresh",
      body: bodyParts.join(" — "),
      url: "/admin",
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
         * Le téléphone n'est plus inscrit :
         * on supprime automatiquement
         * l'ancien abonnement.
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
      `Notifications nouvelle commande : ${sent} envoyée(s), ${failed} échec(s).`
    );
  } catch (error) {
    /*
     * Très important :
     * une panne de notification ne doit jamais
     * faire échouer le paiement ou créer
     * une deuxième commande.
     */
    console.error(
      "Erreur générale notification nouvelle commande :",
      error
    );
  }
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
     * Empêche de traiter deux fois
     * le même paiement Stripe.
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
     * Création définitive de la commande.
     *
     * On récupère la commande créée
     * grâce à .select().single().
     */
    const {
      data: createdOrder,
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

    /*
     * On marque immédiatement
     * le checkout comme payé.
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
    }

    console.log(
      "Commande payée et enregistrée dans Supabase."
    );

    /*
     * Notification aux téléphones admins.
     *
     * On utilise le même système
     * que la notification
     * "Nouveau client So Fresh".
     */
    await sendNewOrderNotification(
      supabase,
      createdOrder
    );

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