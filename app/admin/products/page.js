"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

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

const categories = [
  "Salades",
  "Burgers",
  "Wraps",
  "Pâtes",
  "Soupes",
  "Boissons",
  "Desserts",
  "Autres",
];

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("La photo ne peut pas être lue."));
    };

    image.src = objectUrl;
  });
}

async function compressImage(file) {
  const image = await loadImage(file);

  const maximumWidth = 1600;
  const maximumHeight = 1200;

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  const ratio = Math.min(
    maximumWidth / width,
    maximumHeight / height,
    1
  );

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("La photo ne peut pas être traitée.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(
      (compressedBlob) => resolve(compressedBlob),
      "image/webp",
      0.82
    );
  });

  if (!blob) {
    throw new Error("La compression de la photo a échoué.");
  }

  return blob;
}

export default function ProductsPage() {
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur chargement produits :", error);
      setMessage("Impossible de charger les produits.");
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadProductImage(event) {
    const originalFile = event.target.files?.[0];

    if (!originalFile) {
      return;
    }

    setMessage("");

    if (!originalFile.type.startsWith("image/")) {
      setMessage("Le fichier choisi doit être une image.");
      event.target.value = "";
      return;
    }

    if (originalFile.size > 25 * 1024 * 1024) {
      setMessage("La photo d’origine ne doit pas dépasser 25 Mo.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const compressedBlob = await compressImage(originalFile);

      const cleanName =
        sanitizeFileName(originalFile.name) || "produit";

      const uniqueId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

      const filePath =
        `products/${uniqueId}-${cleanName}.webp`;

      const compressedFile = new File(
        [compressedBlob],
        `${cleanName}.webp`,
        {
          type: "image/webp",
        }
      );

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error(
          "L’adresse publique de la photo est introuvable."
        );
      }

      setForm((current) => ({
        ...current,
        image_url: publicUrlData.publicUrl,
      }));

      const originalSize = Math.round(
        originalFile.size / 1024
      );

      const compressedSize = Math.round(
        compressedBlob.size / 1024
      );

      setMessage(
        `Photo optimisée : ${originalSize} Ko → ${compressedSize} Ko. Enregistrez maintenant le produit.`
      );
    } catch (error) {
      console.error("Erreur photo :", error);

      setMessage(
        error?.message ||
          "La photo n’a pas pu être envoyée."
      );

      event.target.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setMessage("");

    const price = Number(
      String(form.price).replace(",", ".")
    );

    if (
      !form.name.trim() ||
      !form.category.trim() ||
      Number.isNaN(price) ||
      price < 0
    ) {
      setMessage(
        "Indiquez un nom, une catégorie et un prix valide."
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price,
      image_url: form.image_url.trim() || null,
      emoji: form.emoji.trim() || "🥗",
      available: Boolean(form.available),
      display_order: Number(form.display_order || 0),
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    const query = editingId
      ? supabase
          .from("products")
          .update(payload)
          .eq("id", editingId)
      : supabase.from("products").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      console.error(
        "Erreur enregistrement produit :",
        error
      );

      setMessage(
        "Le produit n’a pas pu être enregistré."
      );
      return;
    }

    const successMessage = editingId
      ? "Produit modifié avec succès."
      : "Produit ajouté avec succès.";

    setEditingId(null);
    setForm(emptyForm);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await loadProducts();
    setMessage(successMessage);
  }

  async function toggleAvailability(product) {
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        available: !product.available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      console.error("Erreur disponibilité :", error);
      setMessage(
        "La disponibilité n’a pas pu être modifiée."
      );
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? {
              ...currentProduct,
              available: !currentProduct.available,
            }
          : currentProduct
      )
    );
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${product.name} » ?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Erreur suppression produit :", error);
      setMessage(
        "Le produit n’a pas pu être supprimé."
      );
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter(
        (currentProduct) =>
          currentProduct.id !== product.id
      )
    );

    if (editingId === product.id) {
      resetForm();
    }
  }

  return (
    <main className="admin-wrap products-admin-page">
      <section className="admin-card product-editor-card">
        <div className="product-section-heading">
          <div>
            <span className="product-section-eyebrow">
              Catalogue
            </span>

            <h1>
              {editingId
                ? "Modifier le produit"
                : "Ajouter un produit"}
            </h1>
          </div>

          {editingId && (
            <button
              type="button"
              className="secondary"
              onClick={resetForm}
              disabled={saving || uploading}
            >
              Annuler
            </button>
          )}
        </div>

        <form
          className="product-form"
          onSubmit={saveProduct}
        >
          <div>
            <label htmlFor="product-name">Nom</label>

            <input
              id="product-name"
              required
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="Salade César"
            />
          </div>

          <div>
            <label htmlFor="product-category">
              Catégorie
            </label>

            <select
              id="product-category"
              value={form.category}
              onChange={(event) =>
                updateField(
                  "category",
                  event.target.value
                )
              }
            >
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product-price">Prix</label>

            <input
              id="product-price"
              required
              inputMode="decimal"
              value={form.price}
              onChange={(event) =>
                updateField("price", event.target.value)
              }
              placeholder="10,90"
            />
          </div>

        

          <div className="product-form-wide">
            <label htmlFor="product-description">
              Description
            </label>

            <textarea
              id="product-description"
              rows="3"
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Poulet, parmesan, croûtons et sauce César."
            />
          </div>

          <div className="product-form-wide">
            <label htmlFor="product-photo">
              Photo du produit
            </label>

            <input
              ref={fileInputRef}
              id="product-photo"
              type="file"
              accept="image/*"
              onChange={uploadProductImage}
              disabled={uploading || saving}
            />

            <small
              style={{
                display: "block",
                marginTop: "7px",
                color: "var(--muted)",
              }}
            >
              La photo sera automatiquement redimensionnée et
              compressée en WebP.
            </small>
          </div>

          {form.image_url && (
            <div className="product-form-wide">
              <label>Aperçu</label>

              <div
                style={{
                  width: "200px",
                  height: "150px",
                  overflow: "hidden",
                  borderRadius: "16px",
                  border: "1px solid var(--line)",
                  background: "#ffffff",
                }}
              >
                <img
                  src={form.image_url}
                  alt="Aperçu du produit"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="product-order">
              Ordre d’affichage
            </label>

            <input
              id="product-order"
              type="number"
              min="0"
              value={form.display_order}
              onChange={(event) =>
                updateField(
                  "display_order",
                  event.target.value
                )
              }
            />
          </div>

          <label className="availability-check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                updateField(
                  "available",
                  event.target.checked
                )
              }
            />

            <span>Produit disponible sur le site</span>
          </label>

          <div className="product-form-actions">
            <button
              className="primary"
              disabled={saving || uploading}
            >
              {uploading
                ? "Optimisation de la photo…"
                : saving
                  ? "Enregistrement…"
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Ajouter le produit"}
            </button>
          </div>
        </form>

        {message && (
          <div className="message">{message}</div>
        )}
      </section>

      <section className="admin-card products-list-card">
        <div className="product-section-heading">
          <div>
            <span className="product-section-eyebrow">
              Menu So Fresh
            </span>

            <h2>Produits ({products.length})</h2>
          </div>
        </div>

        {loading && <p>Chargement…</p>}

        {!loading && products.length === 0 && (
          <div className="empty">
            Aucun produit enregistré.
          </div>
        )}

        <div className="products-admin-list">
          {products.map((product) => (
            <article
              className={`product-admin-card ${
                product.available
                  ? ""
                  : "product-unavailable"
              }`}
              key={product.id}
            >
              <div className="product-admin-visual">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <span>
                    {product.emoji || "🥗"}
                  </span>
                )}
              </div>

              <div className="product-admin-info">
                <div className="product-admin-name-row">
                  <strong>{product.name}</strong>
                  <b>{euro(product.price)}</b>
                </div>

                <span className="product-category">
                  {product.category}
                </span>

                {product.description && (
                  <p>{product.description}</p>
                )}

                <span
                  className={
                    product.available
                      ? "availability available"
                      : "availability unavailable"
                  }
                >
                  {product.available
                    ? "Disponible"
                    : "Indisponible"}
                </span>
              </div>

              <div className="product-admin-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => startEdit(product)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  className={
                    product.available
                      ? "secondary"
                      : "primary"
                  }
                  onClick={() =>
                    toggleAvailability(product)
                  }
                >
                  {product.available
                    ? "Rendre indisponible"
                    : "Rendre disponible"}
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() =>
                    deleteProduct(product)
                  }
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
