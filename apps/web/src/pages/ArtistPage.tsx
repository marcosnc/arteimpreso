import { useCallback, useEffect, useState } from "react";
import { api, formatPrice } from "../api/client";

interface PrintFormat {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
}

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  printLimit: number | null;
  printsSold: number;
  isPublished: boolean;
  formatPrices: {
    formatId: string;
    format: { name: string };
    priceCents: number;
    isAvailable: boolean;
  }[];
  _count: { orderItems: number };
}

interface Sale {
  quantity: number;
  unitPriceCents: number;
  artwork: { title: string };
  format: { name: string };
  order: { orderNumber: string; status: string; createdAt: string };
}

interface Payout {
  id: string;
  amountCents: number;
  status: string;
  order: { orderNumber: string };
  createdAt: string;
}

interface ArtworkFormData {
  title: string;
  description: string;
  imageUrl: string;
  printLimit: string;
  isPublished: boolean;
  prices: Record<string, string>;
}

const emptyForm = (formats: PrintFormat[]): ArtworkFormData => ({
  title: "",
  description: "",
  imageUrl: "",
  printLimit: "",
  isPublished: true,
  prices: Object.fromEntries(formats.map((f) => [f.id, ""])),
});

function artworkToForm(artwork: Artwork, formats: PrintFormat[]): ArtworkFormData {
  const prices = Object.fromEntries(formats.map((f) => [f.id, ""]));
  for (const fp of artwork.formatPrices) {
    prices[fp.formatId] = String(fp.priceCents / 100);
  }
  return {
    title: artwork.title,
    description: artwork.description ?? "",
    imageUrl: artwork.imageUrl,
    printLimit: artwork.printLimit !== null ? String(artwork.printLimit) : "",
    isPublished: artwork.isPublished,
    prices,
  };
}

export default function ArtistPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [formats, setFormats] = useState<PrintFormat[]>([]);
  const [sales, setSales] = useState<{ items: Sale[]; totalSalesCents: number } | null>(null);
  const [payouts, setPayouts] = useState<{
    payouts: Payout[];
    summary: { pendingCents: number; paidCents: number };
  } | null>(null);
  const [tab, setTab] = useState<"obras" | "ventas" | "cobros">("obras");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArtworkFormData>(emptyForm([]));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadArtworks = useCallback(() => {
    api<Artwork[]>("/artworks/artist/mine")
      .then(setArtworks)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Error al cargar obras")
      );
  }, []);

  useEffect(() => {
    loadArtworks();
    api<PrintFormat[]>("/artworks/formats/all").then((f) => {
      setFormats(f);
      setForm((prev) => (prev.title ? prev : emptyForm(f)));
    });
    api<{ items: Sale[]; totalSalesCents: number }>("/artist/sales").then(setSales);
    api<{
      payouts: Payout[];
      summary: { pendingCents: number; paidCents: number };
    }>("/artist/payouts").then(setPayouts);
  }, [loadArtworks]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm(formats));
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (artwork: Artwork) => {
    setEditingId(artwork.id);
    setForm(artworkToForm(artwork, formats));
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const buildPayload = () => {
    const formatPrices = formats
      .map((f) => ({
        formatId: f.id,
        priceCents: Math.round(parseFloat(form.prices[f.id] || "0") * 100),
      }))
      .filter((fp) => fp.priceCents > 0);

    if (formatPrices.length === 0) {
      throw new Error("Ingresá al menos un precio por formato");
    }

    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      printLimit: form.printLimit ? parseInt(form.printLimit, 10) : null,
      isPublished: form.isPublished,
      formatPrices,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = buildPayload();
      if (editingId) {
        await api(`/artworks/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/artworks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeForm();
      loadArtworks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (artwork: Artwork) => {
    try {
      await api(`/artworks/${artwork.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !artwork.isPublished }),
      });
      loadArtworks();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const deleteArtwork = async (artwork: Artwork) => {
    if (
      !confirm(
        `¿Eliminar "${artwork.title}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await api(`/artworks/${artwork.id}`, { method: "DELETE" });
      loadArtworks();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Mi estudio</h1>
      <p className="page-subtitle">Gestioná tus obras, ventas y cobros</p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {(["obras", "ventas", "cobros"] as const).map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(t)}
          >
            {t === "obras" ? "Obras" : t === "ventas" ? "Ventas" : "Cobros"}
          </button>
        ))}
      </div>

      {tab === "obras" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ color: "var(--text-muted)" }}>
              {artworks.length} {artworks.length === 1 ? "obra" : "obras"}
            </p>
            <button className="btn btn-primary" onClick={openCreateForm}>
              Nueva obra
            </button>
          </div>

          {loadError && <div className="alert alert-error">{loadError}</div>}

          {showForm && (
            <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                }}
              >
                {editingId ? "Editar obra" : "Nueva obra"}
              </h2>

              {formError && <div className="alert alert-error">{formError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="label">Título</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Descripción</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div className="form-group">
                  <label className="label">URL de la imagen</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">
                    Límite de impresiones (vacío = ilimitado)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.printLimit}
                    onChange={(e) =>
                      setForm({ ...form, printLimit: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="label">Precios por formato (ARS)</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    {formats.map((f) => (
                      <div key={f.id}>
                        <label
                          className="label"
                          style={{ fontSize: "0.8125rem" }}
                        >
                          {f.name}
                        </label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="0"
                          value={form.prices[f.id] ?? ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              prices: {
                                ...form.prices,
                                [f.id]: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) =>
                      setForm({ ...form, isPublished: e.target.checked })
                    }
                  />
                  Publicar en el catálogo
                </label>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear obra"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeForm}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {artworks.length === 0 && !showForm ? (
            <p className="empty-state">
              Todavía no tenés obras. Creá la primera con el botón de arriba.
            </p>
          ) : (
            <div className="grid-artworks">
              {artworks.map((a) => (
                <div key={a.id} className="card">
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    style={{
                      width: "100%",
                      aspectRatio: "4/3",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <h3 style={{ fontFamily: "var(--font-display)" }}>
                        {a.title}
                      </h3>
                      <span
                        className={`badge ${
                          a.isPublished ? "badge-delivered" : "badge-pending"
                        }`}
                      >
                        {a.isPublished ? "Publicada" : "Borrador"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {a._count.orderItems} ventas
                      {a.printLimit !== null &&
                        ` · ${Math.max(0, a.printLimit - a.printsSold)} impresiones restantes`}
                    </p>
                    {a.formatPrices.length > 0 && (
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-muted)",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {a.formatPrices
                          .map(
                            (fp) =>
                              `${fp.format.name}: ${formatPrice(fp.priceCents)}`
                          )
                          .join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                        onClick={() => openEditForm(a)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                        onClick={() => togglePublished(a)}
                      >
                        {a.isPublished ? "Ocultar" : "Publicar"}
                      </button>
                      {a._count.orderItems === 0 && (
                        <button
                          className="btn btn-outline"
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.875rem",
                            color: "#991b1b",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => deleteArtwork(a)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "ventas" && sales && (
        <div>
          <p style={{ marginBottom: "1rem", fontWeight: 600 }}>
            Total vendido: {formatPrice(sales.totalSalesCents)}
          </p>
          {sales.items.map((s, i) => (
            <div key={i} className="card" style={{ padding: "1rem", marginBottom: "0.5rem" }}>
              <p style={{ fontWeight: 500 }}>{s.artwork.title}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                {s.format.name} × {s.quantity} · Pedido {s.order.orderNumber}
              </p>
              <p>{formatPrice(s.unitPriceCents * s.quantity)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "cobros" && payouts && (
        <div>
          <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
            <div className="card" style={{ padding: "1rem", flex: 1 }}>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Pendiente</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {formatPrice(payouts.summary.pendingCents)}
              </p>
            </div>
            <div className="card" style={{ padding: "1rem", flex: 1 }}>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Cobrado</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {formatPrice(payouts.summary.paidCents)}
              </p>
            </div>
          </div>
          {payouts.payouts.map((p) => (
            <div key={p.id} className="card" style={{ padding: "1rem", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pedido {p.order.orderNumber}</span>
                <span className={`badge ${p.status === "PAID" ? "badge-delivered" : "badge-pending"}`}>
                  {p.status === "PAID" ? "Pagado" : "Pendiente"}
                </span>
              </div>
              <p style={{ fontWeight: 600, marginTop: "0.25rem" }}>
                {formatPrice(p.amountCents)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
