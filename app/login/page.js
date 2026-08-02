"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const emptyForm = {
  name: "",
  description: "",
  category: "Salades",
  price: "",
  image_url: "",
  emoji: "🥗",
  available: true,
  display_order: 0,
};

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Impossible de charger les produits.");
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "Salades",
      price: String(product.price ?? ""),
      image_url: product.image_url || "",
      emoji: product.emoji || "🥗",
      available: Boolean(product.available),
      display_order: Number(product.display_order || 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setMessage("");

    const price = Number(String(form.price).replace(",", "."));

    if (!form.name.trim() || !form.category.trim() || Number.isNaN(price)) {
      setMessage("Indiquez au minimum un nom, une catégorie et un prix valide.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price,
      image_url: form.image_url.trim() || null,
      emoji: form.emoji.trim() || "🥗",
      available: form.available,
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    const query = editingId
      ? supabase.from("products").update(payload).eq("id", editingId)
      : supabase.from("products").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Le produit n'a pas pu être enregistré.");
      return;
    }

    setMessage(editingId ? "Produit modifié." : "Produit ajouté.");
    resetForm();
    loadProducts();
  }

  async function toggleAvailability(product) {
    const { error } = await supabase
      .from("products")
      .update({
        available: !product.available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setMessage("La disponibilité n'a pas pu être modifiée.");
      return;
    }

    loadProducts();
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${product.name} » ?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setMessage("Le produit n'a pas pu être supprimé.");
      return;
    }

    loadProducts();
  }

  return (
    <main className="admin-wrap">
      <section className="admin-card">
        <h1>{editingId ? "Modifier le produit" : "Ajouter un produit"}</h1>

        <form className="product-form" onSubmit={saveProduct}>
          <div>
            <label>Nom</label>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Burger So Fresh"
            />
          </div>

          <div>
            <label>Catégorie</label>
            <input
              required
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              placeholder="Burgers"
            />
          </div>

          <div>
            <label>Prix (€)</label>
            <input
              required
              inputMode="decimal"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="10,90"
            />
          </div>

          <div>
            <label>Emoji provisoire</label>
            <input
              value={form.emoji}
              onChange={(event) => updateField("emoji", event.target.value)}
              placeholder="🍔"
            />
          </div>

          <div className="product-form-wide">
            <label>Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>

          <div className="product-form-wide">
            <label>Adresse de la photo</label>
            <input
              value={form.image_url}
              onChange={(event) => updateField("image_url", event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label>Ordre d'affichage</label>
            <input
              type="number"
              value={form.display_order}
              onChange={(event) =>
                updateField("display_order", event.target.value)
              }
            />
          </div>

          <label className="availability-check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                updateField("available", event.target.checked)
              }
            />
            Produit disponible
          </label>

          <div className="product-form-actions">
            <button className="primary" disabled={saving}>
              {saving
                ? "Enregistrement…"
                : editingId
                ? "Enregistrer les modifications"
                : "Ajouter le produit"}
            </button>

            {editingId && (
              <button type="button" className="secondary" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {message && <div className="message">{message}</div>}
      </section>

      <section className="admin-card">
        <h2>Produits</h2>

        {loading && <p>Chargement…</p>}

        <div className="products-admin-list">
          {products.map((product) => (
            <article className="product-admin-card" key={product.id}>
              <div className="product-admin-visual">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <span>{product.emoji || "🥗"}</span>
                )}
              </div>

              <div className="product-admin-info">
                <strong>{product.name}</strong>
                <span>
                  {product.category} · {euro(product.price)}
                </span>
                <span
                  className={
                    product.available
                      ? "availability available"
                      : "availability unavailable"
                  }
                >
                  {product.available ? "Disponible" : "Indisponible"}
                </span>
              </div>

              <div className="product-admin-actions">
                <button
                  className="secondary"
                  onClick={() => startEdit(product)}
                >
                  Modifier
                </button>

                <button
                  className="secondary"
                  onClick={() => toggleAvailability(product)}
                >
                  {product.available ? "Désactiver" : "Activer"}
                </button>

                <button
                  className="danger-button"
                  onClick={() => deleteProduct(product)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
