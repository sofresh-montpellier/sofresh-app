"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const euro = (n) =>
  Number(n).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function isOrderOpen() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  return hour < 11;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [category, setCategory] = useState("Tout");
  const [cart, setCart] = useState({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("11 h 30");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(true);

  useEffect(() => {
    const refresh = () => setOrdersOpen(isOrderOpen());
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (!isSupabaseConfigured) {
        setMessage("Le menu n'est pas encore connecté à Supabase.");
        setProductsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,category,price,image_url,emoji,available,display_order")
        .eq("available", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setMessage("Le menu n'a pas pu être chargé.");
      } else {
        setProducts(data || []);
      }

      setProductsLoading(false);
    }

    loadProducts();
  }, []);

  const categories = ["Tout", ...new Set(products.map((p) => p.category))];
  const visible =
    category === "Tout"
      ? products
      : products.filter((p) => p.category === category);

  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const total = Object.entries(cart).reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === Number(id));
    return product ? sum + Number(product.price) * quantity : sum;
  }, 0);

  function add(id) {
    if (!ordersOpen) {
      setMessage("Les commandes Click & Collect sont clôturées pour aujourd'hui.");
      setOpen(true);
      return;
    }

    setCart((current) => ({
      ...current,
      [id]: (current[id] || 0) + 1,
    }));
  }

  function change(id, delta) {
    setCart((current) => {
      const next = {
        ...current,
        [id]: (current[id] || 0) + delta,
      };

      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  async function submit() {
    setMessage("");

    if (!ordersOpen) {
      return setMessage("Les commandes Click & Collect sont clôturées à 11 h.");
    }

    if (!count) return setMessage("Ajoutez au moins un produit.");
    if (!name.trim() || !phone.trim()) {
      return setMessage("Indiquez votre nom et votre téléphone.");
    }

    if (!isSupabaseConfigured) {
      return setMessage("Supabase n'est pas encore configuré dans Vercel.");
    }

    const items = Object.entries(cart).map(([id, quantity]) => {
      const product = products.find((item) => item.id === Number(id));

      return {
        id: product.id,
        name: product.name,
        unit_price: Number(product.price),
        qty: quantity,
      };
    });

    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        pickup_time: pickup,
        items,
        total,
        status: "Nouvelle",
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      return setMessage(
        new Date().getHours() >= 11
          ? "Les commandes sont clôturées pour aujourd'hui."
          : "La commande n'a pas pu être transmise."
      );
    }

    setMessage(
      `Commande ${String(data.id).slice(0, 8).toUpperCase()} transmise au restaurant.`
    );
    setCart({});
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          SO <span>FRESH</span>
        </div>
        <button className="cart-button" onClick={() => setOpen(true)}>
          Panier · {count}
        </button>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">CLICK & COLLECT</div>
          <h1>
            Frais, rapide,
            <br />
            prêt pour midi.
          </h1>
          <p>
            Commandez avant 11 h et choisissez votre créneau de retrait à partir
            de 11 h 30.
          </p>

          {!ordersOpen && (
            <div className="message" style={{ maxWidth: "640px", marginTop: "18px" }}>
              <strong>Commandes clôturées.</strong>
              <br />
              Les commandes Click & Collect doivent être passées avant 11 h.
            </div>
          )}
        </div>
      </section>

      <main className="container">
        {productsLoading && <p>Chargement du menu…</p>}

        {!productsLoading && products.length === 0 && (
          <div className="message">Aucun produit n'est disponible actuellement.</div>
        )}

        <div className="categories">
          {categories.map((item) => (
            <button
              key={item}
              className={`chip ${item === category ? "active" : ""}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="grid">
          {visible.map((product) => (
            <article className="card" key={product.id}>
              {product.image_url ? (
                <img
                  className="photo"
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: "100%", objectFit: "cover" }}
                />
              ) : (
                <div className="photo">{product.emoji || "🥗"}</div>
              )}

              <div className="card-body">
                <h3>{product.name}</h3>
                <p className="desc">{product.description}</p>

                <div className="row">
                  <span className="price">{euro(product.price)}</span>
                  <button
                    className="primary"
                    disabled={!ordersOpen}
                    onClick={() => add(product.id)}
                  >
                    {ordersOpen ? "Ajouter" : "Fermé"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <div
        className={`overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`panel ${open ? "open" : ""}`}>
        <div className="panel-head">
          <h2>Votre commande</h2>
          <button className="close" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        {!count && <div className="empty">Votre panier est vide.</div>}

        {Object.entries(cart).map(([id, quantity]) => {
          const product = products.find((item) => item.id === Number(id));
          if (!product) return null;

          return (
            <div className="cart-item" key={id}>
              <div>
                <strong>{product.name}</strong>
                <br />
                {euro(Number(product.price) * quantity)}
              </div>

              <div className="qty">
                <button onClick={() => change(product.id, -1)}>−</button>
                <span>{quantity}</span>
                <button onClick={() => change(product.id, 1)}>+</button>
              </div>
            </div>
          );
        })}

        <label>Créneau de retrait</label>
        <select
          value={pickup}
          onChange={(event) => setPickup(event.target.value)}
          disabled={!ordersOpen}
        >
          {[
            "11 h 30",
            "11 h 45",
            "12 h 00",
            "12 h 15",
            "12 h 30",
            "12 h 45",
            "13 h 00",
            "13 h 15",
            "13 h 30",
          ].map((time) => (
            <option key={time}>{time}</option>
          ))}
        </select>

        <label>Nom</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Votre nom"
          disabled={!ordersOpen}
        />

        <label>Téléphone</label>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="06 00 00 00 00"
          disabled={!ordersOpen}
        />

        <div className="total">
          <span>Total</span>
          <span>{euro(total)}</span>
        </div>

        <button
          className="primary"
          style={{ width: "100%" }}
          disabled={loading || !ordersOpen}
          onClick={submit}
        >
          {!ordersOpen
            ? "Commandes clôturées"
            : loading
            ? "Envoi en cours…"
            : "Valider la commande"}
        </button>

        {message && <div className="message">{message}</div>}
      </aside>

      <div className="admin-link">
        <Link href="/admin">Accéder à l'espace administrateur</Link>
      </div>
    </>
  );
}

