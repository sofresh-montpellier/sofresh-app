import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const stripeWebhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;
    console.log(
  "Webhook secret chargé :",
  stripeWebhookSecret
    ? `${stripeWebhookSecret.slice(0, 4)}... / ${stripeWebhookSecret.length} caractères`
    : "ABSENT"
);

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

  const stripe = new Stripe(stripeSecretKey);

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

  const body = await request.text();
  const signature = request.headers.get(
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
    event = stripe.webhooks.constructEvent(
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
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return new Response(
        "Paiement non confirmé",
        { status: 200 }
      );
    }

    const pendingCheckoutId =
      session.metadata?.pending_checkout_id;

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
      .eq("id", pendingCheckoutId)
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

    if (pendingCheckout.status === "paid") {
      return new Response(
        "Commande déjà traitée",
        { status: 200 }
      );
    }

    const { error: orderError } =
      await supabase
        .from("orders")
        .insert({
          customer_name:
            pendingCheckout.customer_name,
          customer_phone:
            pendingCheckout.customer_phone,
            user_id: pendingCheckout.user_id,
          pickup_date:
            pendingCheckout.pickup_date,
          pickup_time:
            pendingCheckout.pickup_time,
          items: pendingCheckout.items,
          total: pendingCheckout.total,
          status: "Nouvelle",
        });

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

    const { error: updateError } =
      await supabase
        .from("pending_checkouts")
        .update({
          status: "paid",
          stripe_session_id: session.id,
        })
        .eq("id", pendingCheckoutId);

    if (updateError) {
      console.error(
        "Commande créée mais pending_checkouts non actualisé :",
        updateError
      );
    }

    console.log(
      "Commande payée et enregistrée dans Supabase."
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