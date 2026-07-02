import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import "./HomePage.css";

interface Artwork {
  id: string;
  title: string;
  imageUrl: string;
  artist: { displayName: string };
  formatPrices: { priceCents: number; format: { name: string } }[];
  printsRemaining: number | null;
}

export default function HomePage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Artwork[]>("/artworks")
      .then(setArtworks)
      .finally(() => setLoading(false));
  }, []);

  const minPrice = (a: Artwork) =>
    Math.min(...a.formatPrices.map((fp) => fp.priceCents));

  return (
    <div className="container">
      <section className="hero">
        <h1 className="hero-title">
          Arte original,<br />
          <em>impreso para vos</em>
        </h1>
        <p className="hero-subtitle">
          Descubrí obras de artistas independientes y recibilas impresas en
          el formato que elijas.
        </p>
      </section>

      {loading ? (
        <p className="empty-state">Cargando obras...</p>
      ) : artworks.length === 0 ? (
        <p className="empty-state">No hay obras disponibles por el momento.</p>
      ) : (
        <div className="grid-artworks">
          {artworks.map((artwork) => (
            <Link
              key={artwork.id}
              to={`/obra/${artwork.id}`}
              className="artwork-card card"
            >
              <div className="artwork-card-image">
                <img src={artwork.imageUrl} alt={artwork.title} loading="lazy" />
                {artwork.printsRemaining !== null &&
                  artwork.printsRemaining <= 10 && (
                    <span className="limited-badge">
                      {artwork.printsRemaining} restantes
                    </span>
                  )}
              </div>
              <div className="artwork-card-body">
                <h2>{artwork.title}</h2>
                <p className="artist-name">{artwork.artist.displayName}</p>
                <p className="price-from">
                  Desde {formatPrice(minPrice(artwork))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
