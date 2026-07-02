import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ArtworkPage.css";

interface FormatPrice {
  id: string;
  formatId: string;
  priceCents: number;
  format: { id: string; name: string; widthCm: number; heightCm: number };
}

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  artist: { displayName: string; bio: string | null };
  formatPrices: FormatPrice[];
  printsRemaining: number | null;
}

export default function ArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Artwork>(`/artworks/${id}`)
      .then((a) => {
        setArtwork(a);
        if (a.formatPrices.length) setSelectedFormat(a.formatPrices[0].formatId);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const selectedPrice = artwork?.formatPrices.find(
    (fp) => fp.formatId === selectedFormat
  );

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await api("/cart/items", {
        method: "POST",
        body: JSON.stringify({
          artworkId: id,
          formatId: selectedFormat,
          quantity,
        }),
      });
      navigate("/carrito");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="container">Cargando...</div>;
  if (!artwork) return <div className="container">Obra no encontrada</div>;

  return (
    <div className="container artwork-detail">
      <div className="artwork-detail-image card">
        <img src={artwork.imageUrl} alt={artwork.title} />
      </div>
      <div className="artwork-detail-info">
        <p className="artist-label">{artwork.artist.displayName}</p>
        <h1 className="page-title">{artwork.title}</h1>
        {artwork.description && (
          <p className="description">{artwork.description}</p>
        )}
        {artwork.printsRemaining !== null && (
          <p className="stock-info">
            {artwork.printsRemaining} impresiones disponibles
          </p>
        )}

        <div className="format-selector">
          <label className="label">Formato de impresión</label>
          <div className="format-options">
            {artwork.formatPrices.map((fp) => (
              <button
                key={fp.formatId}
                className={`format-option ${selectedFormat === fp.formatId ? "selected" : ""}`}
                onClick={() => setSelectedFormat(fp.formatId)}
              >
                <span className="format-name">{fp.format.name}</span>
                <span className="format-dims">
                  {fp.format.widthCm}×{fp.format.heightCm} cm
                </span>
                <span className="format-price">
                  {formatPrice(fp.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="quantity-row">
          <label className="label">Cantidad</label>
          <input
            type="number"
            className="input quantity-input"
            min={1}
            max={artwork.printsRemaining ?? 99}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="action-row">
          <p className="total">
            Total:{" "}
            <strong>
              {formatPrice((selectedPrice?.priceCents ?? 0) * quantity)}
            </strong>
          </p>
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={adding || !selectedFormat}
          >
            {adding ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
