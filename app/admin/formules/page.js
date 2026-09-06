"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function categoryForStep(stepName) {
  const name = String(stepName || "")
    .trim()
    .toLowerCase();

  if (name === "salade") {
    return "Salades";
  }

  if (name === "boisson") {
    return "Boissons";
  }

  if (name === "dessert") {
    return "Desserts";
  }

  if (name === "wrap") {
    return "Wraps";
  }

  if (name === "tacos") {
    return "Tacos";
  }

  if (name === "burger") {
    return "Burgers";
  }

  if (name === "panini") {
    return "Paninis";
  }

  if (name === "sandwich") {
    return "Sandwichs";
  }

  if (name === "club") {
    return "Clubs";
  }

  if (name === "pâtes" || name === "pates") {
    return "Pâtes";
  }

  return "";
}

export default function AdminFormulesPage() {
  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [formulas, setFormulas] =
    useState([]);

  const [steps, setSteps] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [links, setLinks] =
    useState([]);

  const [
    activeFormulaId,
    setActiveFormulaId,
  ] = useState(null);

  const [savingKey, setSavingKey] =
    useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [
        formulasResult,
        productsResult,
        stepsResult,
        linksResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("category", "Formules")
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("products")
          .select("*")
          .order("category", {
            ascending: true,
          })
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("formula_steps")
          .select("*")
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("formula_step_products")
          .select("*"),
      ]);

      if (formulasResult.error) {
        throw formulasResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (stepsResult.error) {
        throw stepsResult.error;
      }

      if (linksResult.error) {
        throw linksResult.error;
      }

      const loadedFormulas =
        formulasResult.data || [];

      setFormulas(loadedFormulas);

      setProducts(
        productsResult.data || []
      );

      setSteps(
        stepsResult.data || []
      );

      setLinks(
        linksResult.data || []
      );

      setActiveFormulaId((current) => {
        if (
          current &&
          loadedFormulas.some(
            (formula) =>
              Number(formula.id) ===
              Number(current)
          )
        ) {
          return current;
        }

        return (
          loadedFormulas[0]?.id || null
        );
      });
    } catch (error) {
      console.error(
        "Erreur chargement formules :",
        error
      );

      setMessage(
        "Impossible de charger les formules."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeFormula = useMemo(
    () =>
      formulas.find(
        (formula) =>
          Number(formula.id) ===
          Number(activeFormulaId)
      ) || null,
    [formulas, activeFormulaId]
  );

  const activeSteps = useMemo(
    () =>
      steps
        .filter(
          (step) =>
            Number(
              step.formula_product_id
            ) ===
            Number(activeFormulaId)
        )
        .sort(
          (a, b) =>
            Number(a.display_order || 0) -
            Number(b.display_order || 0)
        ),
    [steps, activeFormulaId]
  );

  function isProductSelected(
    stepId,
    productId
  ) {
    return links.some(
      (link) =>
        Number(link.formula_step_id) ===
          Number(stepId) &&
        Number(link.product_id) ===
          Number(productId)
    );
  }

  function selectedCount(stepId) {
    return links.filter(
      (link) =>
        Number(link.formula_step_id) ===
        Number(stepId)
    ).length;
  }

  function productsForStep(step) {
    const wantedCategory =
      categoryForStep(step.name);

    if (!wantedCategory) {
      return [];
    }

    return products
      .filter(
        (product) =>
          product.category ===
          wantedCategory
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );
  }

  async function toggleProduct(
    step,
    product
  ) {
    const key =
      `${step.id}-${product.id}`;

    if (savingKey) {
      return;
    }

    setSavingKey(key);
    setMessage("");

    const currentlySelected =
      isProductSelected(
        step.id,
        product.id
      );

    try {
      if (currentlySelected) {
        const { error } =
          await supabase
            .from(
              "formula_step_products"
            )
            .delete()
            .eq(
              "formula_step_id",
              step.id
            )
            .eq(
              "product_id",
              product.id
            );

        if (error) {
          throw error;
        }

        setLinks((current) =>
          current.filter(
            (link) =>
              !(
                Number(
                  link.formula_step_id
                ) === Number(step.id) &&
                Number(
                  link.product_id
                ) === Number(product.id)
              )
          )
        );
      } else {
        const {
          data,
          error,
        } = await supabase
          .from(
            "formula_step_products"
          )
          .insert({
            formula_step_id:
              step.id,
            product_id:
              product.id,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setLinks((current) => [
            ...current,
            data,
          ]);
        }
      }
    } catch (error) {
      console.error(
        "Erreur mise à jour formule :",
        error
      );

      setMessage(
        "La modification n'a pas pu être enregistrée."
      );
    } finally {
      setSavingKey("");
    }
  }

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
          padding: "38px 24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "30px",
            border:
              "1px solid #E5E8DD",
          }}
        >
          Chargement des formules…
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1300px",
        margin: "0 auto",
        padding: "36px 24px 70px",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border:
            "1px solid #E5E8DD",
          borderRadius: "20px",
          padding: "28px",
          boxShadow:
            "0 8px 30px rgba(30,50,10,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                color: "#1E2918",
              }}
            >
              Formules
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#70766B",
                fontSize: "14px",
              }}
            >
              Choisissez les produits
              disponibles dans chaque
              formule.
            </p>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: "12px 15px",
              marginBottom: "20px",
              background: "#FFF2F2",
              border:
                "1px solid #EAC9C9",
              borderRadius: "10px",
              color: "#8A2D2D",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {message}
          </div>
        )}

        {formulas.length === 0 ? (
          <div
            style={{
              padding: "30px",
              background: "#F7F8F2",
              borderRadius: "14px",
              color: "#596052",
            }}
          >
            Aucune formule n'est
            présente dans le catalogue.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "28px",
              }}
            >
              {formulas.map(
                (formula) => {
                  const active =
                    Number(
                      formula.id
                    ) ===
                    Number(
                      activeFormulaId
                    );

                  return (
                    <button
                      key={formula.id}
                      type="button"
                      onClick={() =>
                        setActiveFormulaId(
                          formula.id
                        )
                      }
                      style={{
                        border: active
                          ? "2px solid #86A900"
                          : "1px solid #DDE2D5",

                        background:
                          active
                            ? "#F3F7DF"
                            : "#ffffff",

                        color:
                          "#334016",

                        borderRadius:
                          "999px",

                        padding:
                          "10px 17px",

                        fontWeight:
                          "800",

                        cursor:
                          "pointer",
                      }}
                    >
                      {formula.name}

                      <span
                        style={{
                          marginLeft:
                            "8px",
                          color:
                            "#6E820F",
                        }}
                      >
                        {euro(
                          formula.price
                        )}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {activeFormula && (
              <div
                style={{
                  background:
                    "#F5F8E8",
                  border:
                    "1px solid #DEE8BC",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "19px",
                        color:
                          "#293713",
                      }}
                    >
                      {
                        activeFormula.name
                      }
                    </strong>

                    {activeFormula.description && (
                      <span
                        style={{
                          display:
                            "block",
                          marginTop:
                            "5px",
                          color:
                            "#626B58",
                          fontSize:
                            "14px",
                        }}
                      >
                        {
                          activeFormula.description
                        }
                      </span>
                    )}
                  </div>

                  <strong
                    style={{
                      fontSize: "21px",
                      color:
                        "#5A7F0D",
                    }}
                  >
                    {euro(
                      activeFormula.price
                    )}
                  </strong>
                </div>
              </div>
            )}

            {activeSteps.length ===
            0 ? (
              <div
                style={{
                  padding: "25px",
                  border:
                    "1px dashed #CDD4C1",
                  borderRadius:
                    "14px",
                  color: "#68705F",
                }}
              >
                Cette formule n'a pas
                encore d'étapes
                configurées.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "22px",
                }}
              >
                {activeSteps.map(
                  (step) => {
                    const stepProducts =
                      productsForStep(
                        step
                      );

                    return (
                      <section
                        key={step.id}
                        style={{
                          border:
                            "1px solid #E2E6DB",
                          borderRadius:
                            "16px",
                          overflow:
                            "hidden",
                        }}
                      >
                        <div
                          style={{
                            minHeight:
                              "62px",
                            padding:
                              "0 20px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: "15px",
                            background:
                              "#FAFAF7",
                            borderBottom:
                              "1px solid #E7E9E2",
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "17px",
                                color:
                                  "#26311E",
                              }}
                            >
                              Étape{" "}
                              {
                                step.display_order
                              }{" "}
                              —{" "}
                              {step.name}
                            </strong>

                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "3px",
                                fontSize:
                                  "12px",
                                color:
                                  "#7B8175",
                              }}
                            >
                              Le client
                              choisira{" "}
                              {step.required_quantity ||
                                1}{" "}
                              produit.
                            </span>
                          </div>

                          <span
                            style={{
                              background:
                                "#EEF4D8",
                              color:
                                "#59730D",
                              borderRadius:
                                "999px",
                              padding:
                                "7px 11px",
                              fontSize:
                                "13px",
                              fontWeight:
                                "800",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {selectedCount(
                              step.id
                            )}{" "}
                            autorisé
                            {selectedCount(
                              step.id
                            ) > 1
                              ? "s"
                              : ""}
                          </span>
                        </div>

                        {stepProducts.length ===
                        0 ? (
                          <div
                            style={{
                              padding:
                                "20px",
                              color:
                                "#8A8E85",
                            }}
                          >
                            Aucun produit
                            trouvé pour
                            cette catégorie.
                          </div>
                        ) : (
                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(250px, 1fr))",
                              gap:
                                "12px",
                              padding:
                                "16px",
                            }}
                          >
                            {stepProducts.map(
                              (
                                product
                              ) => {
                                const checked =
                                  isProductSelected(
                                    step.id,
                                    product.id
                                  );

                                const key =
                                  `${step.id}-${product.id}`;

                                const saving =
                                  savingKey ===
                                  key;

                                return (
                                  <button
                                    key={
                                      product.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      toggleProduct(
                                        step,
                                        product
                                      )
                                    }
                                    disabled={
                                      Boolean(
                                        savingKey
                                      )
                                    }
                                    style={{
                                      width:
                                        "100%",

                                      display:
                                        "flex",

                                      alignItems:
                                        "center",

                                      gap:
                                        "12px",

                                      textAlign:
                                        "left",

                                      border:
                                        checked
                                          ? "2px solid #91B400"
                                          : "1px solid #DFE2DA",

                                      background:
                                        checked
                                          ? "#F5F9E6"
                                          : "#FFFFFF",

                                      borderRadius:
                                        "12px",

                                      padding:
                                        "12px",

                                      cursor:
                                        savingKey
                                          ? "wait"
                                          : "pointer",

                                      opacity:
                                        saving
                                          ? 0.65
                                          : 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width:
                                          "26px",
                                        height:
                                          "26px",
                                        borderRadius:
                                          "7px",
                                        flex:
                                          "0 0 26px",
                                        border:
                                          checked
                                            ? "2px solid #7FA000"
                                            : "2px solid #C8CDC1",
                                        background:
                                          checked
                                            ? "#8DB100"
                                            : "#FFFFFF",
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        justifyContent:
                                          "center",
                                        color:
                                          "#FFFFFF",
                                        fontWeight:
                                          "900",
                                        fontSize:
                                          "16px",
                                      }}
                                    >
                                      {checked
                                        ? "✓"
                                        : ""}
                                    </span>

                                    <div
                                      style={{
                                        minWidth:
                                          0,
                                        flex: 1,
                                      }}
                                    >
                                      <strong
                                        style={{
                                          display:
                                            "block",
                                          color:
                                            "#222A1E",
                                          fontSize:
                                            "14px",
                                        }}
                                      >
                                        {
                                          product.name
                                        }
                                      </strong>

                                      <span
                                        style={{
                                          display:
                                            "block",
                                          marginTop:
                                            "3px",
                                          color:
                                            "#757A70",
                                          fontSize:
                                            "12px",
                                        }}
                                      >
                                        {product.available ===
                                        false
                                          ? "Indisponible actuellement"
                                          : "Disponible"}
                                      </span>
                                    </div>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </section>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}